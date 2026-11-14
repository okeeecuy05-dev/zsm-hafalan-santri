"""Agregasi matriks harian untuk Dasbor Ustadz.

Aturan indikator warna (berdasarkan kelengkapan sesi pada tanggal yang dipilih):
- HIJAU  : Ziadah, Sabqi, dan Muraja'ah semuanya sudah disetor.
- KUNING : sebagian sesi sudah disetor (1 atau 2 dari 3).
- MERAH  : belum ada setoran sama sekali.
Status pending/verified tidak memengaruhi warna; keduanya tampil di sel sesi dan
di kolom "menunggu validasi".
"""
import uuid
from collections.abc import Iterable, Sequence
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.waktu import hari_ini
from app.models.enums import StatusSetoran, TipeSesi
from app.models.setoran_log import SetoranLog
from app.schemas.dashboard import (
    BarisSantri,
    DashboardUstadzResponse,
    Indikator,
    MatriksSesi,
    RingkasanDashboard,
    SelSesi,
    StatusSesi,
)
from app.services.santri_query import SantriRow, cari_santri
from app.services.streak_service import URUTAN_SESI


def indikator_dari(jumlah_sesi: int) -> Indikator:
    if jumlah_sesi >= len(URUTAN_SESI):
        return Indikator.HIJAU
    if jumlah_sesi > 0:
        return Indikator.KUNING
    return Indikator.MERAH


def sel_dari(daftar_status: Sequence[StatusSetoran]) -> SelSesi:
    """Satu sel matriks. Jika ada setoran yang masih pending, sel dianggap MENUNGGU."""
    if not daftar_status:
        return SelSesi(status=StatusSesi.BELUM, jumlah_setoran=0)
    if any(st == StatusSetoran.PENDING for st in daftar_status):
        return SelSesi(status=StatusSesi.MENUNGGU, jumlah_setoran=len(daftar_status))
    return SelSesi(status=StatusSesi.TERVERIFIKASI, jumlah_setoran=len(daftar_status))


def susun_dashboard(
    tanggal: date,
    santri: Sequence[SantriRow],
    logs: Iterable[tuple[uuid.UUID, TipeSesi, StatusSetoran]],
) -> DashboardUstadzResponse:
    per_santri: dict[uuid.UUID, dict[TipeSesi, list[StatusSetoran]]] = {
        s.id: {sesi: [] for sesi in URUTAN_SESI} for s in santri
    }
    for santri_id, sesi, status in logs:
        tempat = per_santri.get(santri_id)
        if tempat is not None:
            tempat[sesi].append(status)

    kandidat: list[tuple[SantriRow, dict[TipeSesi, SelSesi], int, int]] = []
    for s in santri:
        daftar = per_santri[s.id]
        sel = {sesi: sel_dari(daftar[sesi]) for sesi in URUTAN_SESI}
        jumlah_sesi = sum(1 for c in sel.values() if c.jumlah_setoran > 0)
        menunggu = sum(1 for lst in daftar.values() for st in lst if st == StatusSetoran.PENDING)
        kandidat.append((s, sel, jumlah_sesi, menunggu))

    # Klasemen: sesi terbanyak di atas; sama banyak diurutkan nama.
    kandidat.sort(key=lambda k: (-k[2], k[0].nama_lengkap.casefold()))

    baris: list[BarisSantri] = []
    peringkat = 0
    jumlah_sebelumnya: int | None = None
    for indeks, (s, sel, jumlah_sesi, menunggu) in enumerate(kandidat, start=1):
        if jumlah_sesi != jumlah_sebelumnya:  # peringkat sama untuk jumlah sesi yang sama
            peringkat = indeks
            jumlah_sebelumnya = jumlah_sesi
        baris.append(
            BarisSantri(
                santri_id=s.id,
                nama_lengkap=s.nama_lengkap,
                halaqah_id=s.halaqah_id,
                nama_halaqah=s.nama_halaqah,
                peringkat=peringkat,
                sesi=MatriksSesi(
                    ziadah=sel[TipeSesi.ZIADAH],
                    sabqi=sel[TipeSesi.SABQI],
                    murajaah=sel[TipeSesi.MURAJAAH],
                ),
                jumlah_sesi=jumlah_sesi,
                menunggu_validasi=menunggu,
                indikator=indikator_dari(jumlah_sesi),
            )
        )

    ringkasan = RingkasanDashboard(
        total_santri=len(baris),
        hijau=sum(1 for b in baris if b.indikator == Indikator.HIJAU),
        kuning=sum(1 for b in baris if b.indikator == Indikator.KUNING),
        merah=sum(1 for b in baris if b.indikator == Indikator.MERAH),
        menunggu_validasi=sum(b.menunggu_validasi for b in baris),
    )
    return DashboardUstadzResponse(tanggal=tanggal, ringkasan=ringkasan, santri=baris)


async def bangun_dashboard(
    db: AsyncSession,
    tanggal: date | None,
    ustadz_id: uuid.UUID | None,
    halaqah_id: uuid.UUID | None,
    q: str | None,
) -> DashboardUstadzResponse:
    tanggal = tanggal or hari_ini()

    santri = await cari_santri(db, ustadz_id, halaqah_id, q)

    logs: list[tuple[uuid.UUID, TipeSesi, StatusSetoran]] = []
    if santri:
        hasil_log = await db.execute(
            select(SetoranLog.santri_id, SetoranLog.tipe_sesi, SetoranLog.status).where(
                SetoranLog.tanggal == tanggal,
                SetoranLog.santri_id.in_([s.id for s in santri]),
            )
        )
        logs = [(r.santri_id, r.tipe_sesi, r.status) for r in hasil_log.all()]

    return susun_dashboard(tanggal, santri, logs)
