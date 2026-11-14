"""Perhitungan ZSM Streak.

Aturan:
- Sebuah hari dianggap LENGKAP jika santri punya setoran Ziadah, Sabqi, dan Muraja'ah
  pada tanggal tersebut (status pending maupun verified sama-sama dihitung).
- Current streak = jumlah hari lengkap berturut-turut yang berakhir HARI INI,
  atau berakhir KEMARIN jika hari ini belum lengkap (hari ini masih bisa diselesaikan,
  jadi streak belum putus sampai hari berganti).
- Highest streak = rangkaian hari lengkap terpanjang sepanjang riwayat.
"""
import uuid
from collections import defaultdict
from collections.abc import Iterable
from datetime import date, timedelta
from typing import NamedTuple

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.waktu import hari_ini
from app.models.enums import TipeSesi
from app.models.santri_profile import SantriProfile
from app.models.setoran_log import SetoranLog
from app.schemas.streak import HariStreak, SesiHariIni, StreakResponse

URUTAN_SESI: tuple[TipeSesi, ...] = (TipeSesi.ZIADAH, TipeSesi.SABQI, TipeSesi.MURAJAAH)
SESI_LENGKAP = frozenset(URUTAN_SESI)
JUMLAH_HARI_MINGGUAN = 7


class HasilStreak(NamedTuple):
    current: int
    highest: int
    terakhir_lengkap: date | None


def hitung_streak(tanggal_lengkap: Iterable[date], hari: date) -> HasilStreak:
    """Hitung current/highest streak dari kumpulan tanggal yang sesinya lengkap."""
    himpunan = set(tanggal_lengkap)
    if not himpunan:
        return HasilStreak(0, 0, None)

    tertinggi = 0
    rangkaian = 0
    sebelumnya: date | None = None
    for tgl in sorted(himpunan):
        if sebelumnya is not None and (tgl - sebelumnya).days == 1:
            rangkaian += 1
        else:
            rangkaian = 1
        tertinggi = max(tertinggi, rangkaian)
        sebelumnya = tgl

    kemarin = hari - timedelta(days=1)
    if hari in himpunan:
        ujung = hari
    elif kemarin in himpunan:
        ujung = kemarin
    else:
        return HasilStreak(0, tertinggi, max(himpunan))

    berjalan = 0
    cursor = ujung
    while cursor in himpunan:
        berjalan += 1
        cursor -= timedelta(days=1)
    return HasilStreak(berjalan, tertinggi, max(himpunan))


def tanggal_lengkap_dari(peta: dict[date, set[TipeSesi]]) -> list[date]:
    return [tgl for tgl, sesi in peta.items() if sesi >= SESI_LENGKAP]


def susun_respons(
    santri_id: uuid.UUID,
    hari: date,
    peta: dict[date, set[TipeSesi]],
    hasil: HasilStreak,
) -> StreakResponse:
    sesi_ini = peta.get(hari, set())
    tersisa = [s for s in URUTAN_SESI if s not in sesi_ini]
    lengkap = not tersisa

    mingguan: list[HariStreak] = []
    for mundur in range(JUMLAH_HARI_MINGGUAN - 1, -1, -1):
        tgl = hari - timedelta(days=mundur)
        sesi = peta.get(tgl, set())
        mingguan.append(
            HariStreak(tanggal=tgl, jumlah_sesi=len(sesi), lengkap=sesi >= SESI_LENGKAP)
        )

    return StreakResponse(
        santri_id=santri_id,
        tanggal=hari,
        current_streak=hasil.current,
        highest_streak=hasil.highest,
        hari_ini_lengkap=lengkap,
        terancam=hasil.current > 0 and not lengkap,
        sesi_hari_ini=SesiHariIni(
            ziadah=TipeSesi.ZIADAH in sesi_ini,
            sabqi=TipeSesi.SABQI in sesi_ini,
            murajaah=TipeSesi.MURAJAAH in sesi_ini,
        ),
        sesi_tersisa=tersisa,
        mingguan=mingguan,
    )


async def _muat_peta_sesi(db: AsyncSession, santri_id: uuid.UUID) -> dict[date, set[TipeSesi]]:
    result = await db.execute(
        select(SetoranLog.tanggal, SetoranLog.tipe_sesi)
        .where(SetoranLog.santri_id == santri_id)
        .distinct()
    )
    peta: dict[date, set[TipeSesi]] = defaultdict(set)
    for tanggal, sesi in result.all():
        peta[tanggal].add(sesi)
    return peta


async def _simpan_profil(db: AsyncSession, santri_id: uuid.UUID, hasil: HasilStreak) -> None:
    stmt = pg_insert(SantriProfile).values(
        user_id=santri_id,
        current_streak=hasil.current,
        highest_streak=hasil.highest,
        last_complete_date=hasil.terakhir_lengkap,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[SantriProfile.user_id],
        set_={
            "current_streak": hasil.current,
            "highest_streak": hasil.highest,
            "last_complete_date": hasil.terakhir_lengkap,
            "updated_at": func.now(),
        },
    )
    await db.execute(stmt)
    await db.commit()


async def hitung_dan_simpan(db: AsyncSession, santri_id: uuid.UUID) -> StreakResponse:
    """Hitung streak dari riwayat setoran, simpan ke santri_profiles, kembalikan respons."""
    hari = hari_ini()
    peta = await _muat_peta_sesi(db, santri_id)
    hasil = hitung_streak(tanggal_lengkap_dari(peta), hari)
    await _simpan_profil(db, santri_id, hasil)
    return susun_respons(santri_id, hari, peta, hasil)
