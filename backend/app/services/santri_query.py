import uuid
from typing import NamedTuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import UserRole
from app.models.halaqah import Halaqah
from app.models.user import User


class SantriRow(NamedTuple):
    id: uuid.UUID
    nama_lengkap: str
    halaqah_id: uuid.UUID | None
    nama_halaqah: str | None


def _pola_ilike(q: str) -> str:
    """Escape karakter khusus LIKE agar '%' dan '_' dicari apa adanya."""
    aman = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{aman}%"


async def cari_santri(
    db: AsyncSession,
    ustadz_id: uuid.UUID | None,
    halaqah_id: uuid.UUID | None,
    q: str | None,
) -> list[SantriRow]:
    """Santri yang terlihat: dibatasi halaqah milik ustadz (jika ustadz_id), halaqah tertentu, dan nama."""
    stmt = (
        select(User.id, User.nama_lengkap, User.halaqah_id, Halaqah.nama_kelas)
        .outerjoin(Halaqah, User.halaqah_id == Halaqah.id)
        .where(User.role == UserRole.SANTRI)
    )
    if ustadz_id is not None:
        stmt = stmt.where(Halaqah.ustadz_id == ustadz_id)
    if halaqah_id is not None:
        stmt = stmt.where(User.halaqah_id == halaqah_id)
    if q is not None and q.strip():
        stmt = stmt.where(User.nama_lengkap.ilike(_pola_ilike(q.strip()), escape="\\"))
    hasil = await db.execute(stmt)
    return [SantriRow(r.id, r.nama_lengkap, r.halaqah_id, r.nama_kelas) for r in hasil.all()]
