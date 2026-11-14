"""Analitik hafalan: progres, prediksi khatam, dan deteksi santri melambat.

Definisi (semua berbasis Ziadah TERVERIFIKASI, karena Sabqi/Muraja'ah adalah pengulangan):
- ayat_terekam   : jumlah ayat UNIK yang pernah disetor sebagai Ziadah terverifikasi (tumpang tindih dihitung sekali).
- total_hafal    : min(6236, hafalan_awal_ayat + ayat_terekam).
- target_ayat    : ceil(6236 * target_juz / 30). Proporsional, karena urutan hafalan berbeda tiap pesantren.
- kecepatan rata-rata: ayat BARU per hari kalender pada 30 hari terakhir (jendela dipendekkan untuk santri baru).
- estimasi khatam: hari ini + ceil(sisa_ayat / rata-rata); None jika tidak dapat diprediksi.
- melambat       : kecepatan 7 hari terakhir < ambang (default 50%) x kecepatan 28 hari sebelumnya,
                   hanya untuk santri dengan riwayat >= 14 hari dan target belum tercapai.
"""
import uuid
from collections import defaultdict
from collections.abc import Iterable, Sequence
from datetime import date, timedelta
from typing import NamedTuple

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.quran_meta import TOTAL_AYAT, ayat_untuk_juz, ke_indeks
from app.core.waktu import hari_ini
from app.models.enums import StatusSetoran, TipeSesi
from app.models.halaqah import Halaqah
from app.models.santri_profile import SantriProfile
from app.models.setoran_log import SetoranLog
from app.models.user import User
from app.schemas.analytics import (
    AnalitikSantri,
    AnalitikUstadzResponse,
    ProfilSantriResponse,
    RingkasAnalitikSantri,
    StatusPrediksi,
    TitikGrafik,
)
from app.services import badge_service
from app.services.santri_query import SantriRow, cari_santri

Interval = tuple[int, int]

JENDELA_CEPAT_HARI = 7
JENDELA_PEMBANDING_HARI = 28
MAKS_HARI_PREDIKSI = 36_500  # 100 tahun; lebih dari ini dianggap tidak bermakna (dan menghindari overflow tanggal)


class LogZiadah(NamedTuple):
    tanggal: date
    awal: int
    akhir: int


# ---------- operasi interval (indeks ayat 1..6236, inklusif) ----------
def gabung(intervals: Iterable[Interval]) -> list[Interval]:
    hasil: list[list[int]] = []
    for a, b in sorted(intervals):
        if hasil and a <= hasil[-1][1] + 1:
            if b > hasil[-1][1]:
                hasil[-1][1] = b
        else:
            hasil.append([a, b])
    return [(a, b) for a, b in hasil]


def panjang(merged: Sequence[Interval]) -> int:
    return sum(b - a + 1 for a, b in merged)


def irisan_panjang(x: Sequence[Interval], y: Sequence[Interval]) -> int:
    """Jumlah ayat yang ada di kedua himpunan (keduanya sudah digabung & terurut)."""
    i = j = total = 0
    while i < len(x) and j < len(y):
        lo = max(x[i][0], y[j][0])
        hi = min(x[i][1], y[j][1])
        if lo <= hi:
            total += hi - lo + 1
        if x[i][1] < y[j][1]:
            i += 1
        else:
            j += 1
    return total


def ayat_baru(logs: Sequence[LogZiadah], mulai: date, sampai: date) -> int:
    """Ayat yang untuk pertama kalinya disetor pada [mulai, sampai] (belum ada di setoran sebelum `mulai`)."""
    sebelum = gabung((l.awal, l.akhir) for l in logs if l.tanggal < mulai)
    jendela = gabung((l.awal, l.akhir) for l in logs if mulai <= l.tanggal <= sampai)
    return panjang(jendela) - irisan_panjang(jendela, sebelum)


# ---------- perhitungan murni ----------
def hitung_analitik(
    logs: Sequence[LogZiadah],
    hafalan_awal: int,
    target_juz: int,
    hari: date,
    *,
    jendela: int | None = None,
    ambang: float | None = None,
    min_hari_data: int | None = None,
) -> AnalitikSantri:
    jendela = jendela if jendela is not None else settings.analitik_jendela_hari
    ambang = ambang if ambang is not None else settings.melambat_ambang
    min_hari_data = min_hari_data if min_hari_data is not None else settings.melambat_min_hari_data

    terekam = panjang(gabung((l.awal, l.akhir) for l in logs))
    total = min(TOTAL_AYAT, max(0, hafalan_awal) + terekam)
    target_ayat = ayat_untuk_juz(target_juz)
    sisa = max(0, target_ayat - total)
    persen = min(100.0, round(total / target_ayat * 100, 1)) if target_ayat > 0 else 100.0

    pertama = min((l.tanggal for l in logs), default=None)
    terakhir = max((l.tanggal for l in logs), default=None)

    # --- kecepatan rata-rata & prediksi ---
    avg: float | None = None
    hari_efektif = 0
    baru_jendela = 0
    if pertama is not None:
        hari_efektif = min(jendela, (hari - pertama).days + 1)
        baru_jendela = ayat_baru(logs, hari - timedelta(days=jendela - 1), hari)
        if hari_efektif > 0 and baru_jendela > 0:
            avg = baru_jendela / hari_efektif

    estimasi: date | None = None
    hari_menuju: int | None = None
    if sisa == 0:
        status = StatusPrediksi.TERCAPAI
        hari_menuju = 0
    elif pertama is None:
        status = StatusPrediksi.BELUM_ADA_DATA
    elif avg is None:
        status = StatusPrediksi.TIDAK_AKTIF
    else:
        butuh = -(-sisa * hari_efektif // baru_jendela)  # ceil(sisa / avg), eksak dengan bilangan bulat
        if butuh > MAKS_HARI_PREDIKSI:
            status = StatusPrediksi.TERLALU_JAUH
        else:
            status = StatusPrediksi.TERPREDIKSI
            hari_menuju = butuh
            estimasi = hari + timedelta(days=butuh)

    # --- deteksi melambat ---
    baru_7 = ayat_baru(logs, hari - timedelta(days=JENDELA_CEPAT_HARI - 1), hari) if logs else 0
    kec_7 = baru_7 / JENDELA_CEPAT_HARI
    kec_pembanding = 0.0
    melambat = False
    penurunan: int | None = None
    if pertama is not None and sisa > 0 and (hari - pertama).days >= min_hari_data:
        akhir_p = hari - timedelta(days=JENDELA_CEPAT_HARI)
        mulai_p = hari - timedelta(days=JENDELA_CEPAT_HARI + JENDELA_PEMBANDING_HARI - 1)
        hari_p = (akhir_p - max(mulai_p, pertama)).days + 1
        baru_p = ayat_baru(logs, max(mulai_p, pertama), akhir_p)
        if hari_p > 0:
            kec_pembanding = baru_p / hari_p
        if baru_p > 0 and kec_7 < ambang * kec_pembanding:
            melambat = True
            penurunan = round((1 - kec_7 / kec_pembanding) * 100)

    return AnalitikSantri(
        target_juz=target_juz,
        hafalan_awal_ayat=hafalan_awal,
        ayat_terekam=terekam,
        total_hafal_ayat=total,
        juz_hafal=round(total / TOTAL_AYAT * 30, 1),
        target_ayat=target_ayat,
        sisa_ayat=sisa,
        persen_target=persen,
        avg_ayat_per_hari=round(avg, 2) if avg is not None else None,
        jendela_hari=hari_efektif,
        status_prediksi=status,
        estimasi_khatam=estimasi,
        hari_menuju_khatam=hari_menuju,
        kecepatan_7_hari=round(kec_7, 2),
        kecepatan_pembanding=round(kec_pembanding, 2),
        melambat=melambat,
        persen_penurunan=penurunan,
        tidak_aktif_hari=(hari - terakhir).days if terakhir is not None else None,
    )


def hitung_grafik(
    logs: Sequence[LogZiadah], hafalan_awal: int, hari: date, jumlah_hari: int
) -> list[TitikGrafik]:
    """Total hafalan kumulatif per hari selama `jumlah_hari` hari terakhir."""
    mulai = hari - timedelta(days=jumlah_hari - 1)
    berjalan = gabung((l.awal, l.akhir) for l in logs if l.tanggal < mulai)
    per_hari: dict[date, list[Interval]] = defaultdict(list)
    for l in logs:
        if mulai <= l.tanggal <= hari:
            per_hari[l.tanggal].append((l.awal, l.akhir))

    nilai = min(TOTAL_AYAT, max(0, hafalan_awal) + panjang(berjalan))
    titik: list[TitikGrafik] = []
    for i in range(jumlah_hari):
        tgl = mulai + timedelta(days=i)
        if tgl in per_hari:
            berjalan = gabung([*berjalan, *per_hari[tgl]])
            nilai = min(TOTAL_AYAT, max(0, hafalan_awal) + panjang(berjalan))
        titik.append(TitikGrafik(tanggal=tgl, kumulatif_ayat=nilai))
    return titik


def susun_ringkasan(
    santri: Sequence[SantriRow],
    logs_map: dict[uuid.UUID, list[LogZiadah]],
    profil_map: dict[uuid.UUID, tuple[int, int]],
    hari: date,
) -> AnalitikUstadzResponse:
    """profil_map: santri_id -> (target_juz, hafalan_awal_ayat). Santri tanpa profil memakai (30, 0)."""
    baris: list[RingkasAnalitikSantri] = []
    for s in santri:
        target, awal = profil_map.get(s.id, (30, 0))
        baris.append(
            RingkasAnalitikSantri(
                santri_id=s.id,
                nama_lengkap=s.nama_lengkap,
                halaqah_id=s.halaqah_id,
                nama_halaqah=s.nama_halaqah,
                analitik=hitung_analitik(logs_map.get(s.id, []), awal, target, hari),
            )
        )
    baris.sort(key=lambda b: (not b.analitik.melambat, b.nama_lengkap.casefold()))
    return AnalitikUstadzResponse(
        tanggal=hari,
        jumlah_melambat=sum(1 for b in baris if b.analitik.melambat),
        santri=baris,
    )


# ---------- akses database ----------
async def muat_log_ziadah(
    db: AsyncSession, santri_ids: Sequence[uuid.UUID]
) -> dict[uuid.UUID, list[LogZiadah]]:
    if not santri_ids:
        return {}
    hasil = await db.execute(
        select(
            SetoranLog.santri_id,
            SetoranLog.tanggal,
            SetoranLog.surah_awal,
            SetoranLog.ayat_awal,
            SetoranLog.surah_akhir,
            SetoranLog.ayat_akhir,
        ).where(
            SetoranLog.santri_id.in_(list(santri_ids)),
            SetoranLog.tipe_sesi == TipeSesi.ZIADAH,
            SetoranLog.status == StatusSetoran.VERIFIED,
        )
    )
    peta: dict[uuid.UUID, list[LogZiadah]] = defaultdict(list)
    for r in hasil.all():
        peta[r.santri_id].append(
            LogZiadah(
                r.tanggal,
                ke_indeks(r.surah_awal, r.ayat_awal),
                ke_indeks(r.surah_akhir, r.ayat_akhir),
            )
        )
    return peta


async def muat_profil_map(
    db: AsyncSession, santri_ids: Sequence[uuid.UUID]
) -> dict[uuid.UUID, tuple[int, int]]:
    if not santri_ids:
        return {}
    hasil = await db.execute(
        select(
            SantriProfile.user_id, SantriProfile.target_juz, SantriProfile.hafalan_awal_ayat
        ).where(SantriProfile.user_id.in_(list(santri_ids)))
    )
    return {r.user_id: (r.target_juz, r.hafalan_awal_ayat) for r in hasil.all()}


async def _simpan_hasil(
    db: AsyncSession, santri_id: uuid.UUID, hasil: AnalitikSantri
) -> None:
    stmt = pg_insert(SantriProfile).values(
        user_id=santri_id,
        avg_ayat_per_day=hasil.avg_ayat_per_hari,
        estimasi_khatam_date=hasil.estimasi_khatam,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[SantriProfile.user_id],
        set_={
            "avg_ayat_per_day": hasil.avg_ayat_per_hari,
            "estimasi_khatam_date": hasil.estimasi_khatam,
            "updated_at": func.now(),
        },
    )
    await db.execute(stmt)
    await db.commit()


async def hitung_dan_simpan(
    db: AsyncSession, santri_id: uuid.UUID, hari: date | None = None
) -> tuple[AnalitikSantri, list[LogZiadah]]:
    """Hitung analitik, simpan rata-rata & estimasi ke santri_profiles, dan berikan lencana yang layak."""
    hari = hari or hari_ini()
    logs = (await muat_log_ziadah(db, [santri_id])).get(santri_id, [])
    target, awal = (await muat_profil_map(db, [santri_id])).get(santri_id, (30, 0))
    hasil = hitung_analitik(logs, awal, target, hari)
    await _simpan_hasil(db, santri_id, hasil)
    await badge_service.berikan_badge(db, santri_id, hasil.total_hafal_ayat, hari)
    return hasil, logs


async def bangun_profil(
    db: AsyncSession, santri_id: uuid.UUID, jumlah_hari_grafik: int
) -> ProfilSantriResponse:
    hari = hari_ini()
    baris = (
        await db.execute(
            select(User.nama_lengkap, Halaqah.nama_kelas)
            .outerjoin(Halaqah, User.halaqah_id == Halaqah.id)
            .where(User.id == santri_id)
        )
    ).one()
    hasil, logs = await hitung_dan_simpan(db, santri_id, hari)
    _, awal = (await muat_profil_map(db, [santri_id])).get(santri_id, (30, 0))
    return ProfilSantriResponse(
        santri_id=santri_id,
        nama_lengkap=baris.nama_lengkap,
        nama_halaqah=baris.nama_kelas,
        tanggal=hari,
        analitik=hasil,
        grafik=hitung_grafik(logs, awal, hari, jumlah_hari_grafik),
        badges=await badge_service.daftar_badge_santri(db, santri_id),
    )


async def bangun_analitik_ustadz(
    db: AsyncSession,
    ustadz_id: uuid.UUID | None,
    halaqah_id: uuid.UUID | None,
    q: str | None,
) -> AnalitikUstadzResponse:
    hari = hari_ini()
    santri = await cari_santri(db, ustadz_id, halaqah_id, q)
    ids = [s.id for s in santri]
    logs_map = await muat_log_ziadah(db, ids)
    profil_map = await muat_profil_map(db, ids)
    return susun_ringkasan(santri, logs_map, profil_map, hari)
