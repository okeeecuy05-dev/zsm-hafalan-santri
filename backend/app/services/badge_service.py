"""Lencana milestone: "Hafal N Juz" untuk N = 1, 5, 10, 15, 20, 25, 30.

Lencana diberikan otomatis saat total hafalan (hafalan awal + Ziadah terverifikasi) melewati ambangnya,
dan tidak pernah dicabut. Ambang dihitung proporsional: N juz = ceil(6236 * N / 30) ayat.
"""
import uuid
from datetime import date

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.quran_meta import ayat_untuk_juz
from app.models.badge import Badge, SantriBadge
from app.schemas.analytics import BadgeStatus

MILESTONE_JUZ: tuple[int, ...] = (1, 5, 10, 15, 20, 25, 30)


def kriteria_juz(juz: int) -> str:
    return f"juz:{juz}"


def juz_dari_kriteria(kriteria: str) -> int:
    awalan, _, nilai = kriteria.partition(":")
    if awalan != "juz" or not nilai.isdigit():
        raise ValueError(f"Kriteria lencana tidak dikenal: {kriteria!r}")
    return int(nilai)


async def pastikan_badge_dasar(db: AsyncSession) -> None:
    """Idempoten: menambahkan lencana milestone yang belum ada."""
    stmt = pg_insert(Badge).values(
        [
            {
                "id": uuid.uuid4(),
                "nama_badge": f"Hafal {n} Juz",
                "kriteria_pencapaian": kriteria_juz(n),
            }
            for n in MILESTONE_JUZ
        ]
    )
    await db.execute(stmt.on_conflict_do_nothing(index_elements=[Badge.kriteria_pencapaian]))
    await db.commit()


async def berikan_badge(db: AsyncSession, santri_id: uuid.UUID, total_ayat: int, hari: date) -> None:
    badges = (await db.execute(select(Badge))).scalars().all()
    layak = [
        {"santri_id": santri_id, "badge_id": b.id, "tanggal_didapat": hari}
        for b in badges
        if ayat_untuk_juz(juz_dari_kriteria(b.kriteria_pencapaian)) <= total_ayat
    ]
    if not layak:
        return
    stmt = pg_insert(SantriBadge).values(layak)
    await db.execute(
        stmt.on_conflict_do_nothing(index_elements=[SantriBadge.santri_id, SantriBadge.badge_id])
    )
    await db.commit()


async def daftar_badge_santri(db: AsyncSession, santri_id: uuid.UUID) -> list[BadgeStatus]:
    hasil = await db.execute(
        select(
            Badge.id,
            Badge.nama_badge,
            Badge.kriteria_pencapaian,
            SantriBadge.tanggal_didapat,
            SantriBadge.dilihat,
        )
        .outerjoin(
            SantriBadge,
            (SantriBadge.badge_id == Badge.id) & (SantriBadge.santri_id == santri_id),
        )
    )
    daftar: list[BadgeStatus] = []
    for r in hasil.all():
        juz = juz_dari_kriteria(r.kriteria_pencapaian)
        diperoleh = r.tanggal_didapat is not None
        daftar.append(
            BadgeStatus(
                id=r.id,
                nama_badge=r.nama_badge,
                kriteria_pencapaian=r.kriteria_pencapaian,
                juz=juz,
                ambang_ayat=ayat_untuk_juz(juz),
                diperoleh=diperoleh,
                tanggal_didapat=r.tanggal_didapat,
                baru=diperoleh and not r.dilihat,
            )
        )
    daftar.sort(key=lambda b: b.juz)
    return daftar


async def tandai_dilihat(db: AsyncSession, santri_id: uuid.UUID) -> int:
    hasil = await db.execute(
        update(SantriBadge)
        .where(SantriBadge.santri_id == santri_id, SantriBadge.dilihat.is_(False))
        .values(dilihat=True)
    )
    await db.commit()
    return hasil.rowcount or 0
