import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import UserRole
from app.models.halaqah import Halaqah
from app.models.user import User
from app.services.setoran_service import get_santri_or_404


async def id_santri_ustadz(db: AsyncSession, ustadz_id: uuid.UUID) -> list[uuid.UUID]:
    """ID santri pada halaqah-halaqah yang diampu ustadz."""
    hasil = await db.execute(
        select(User.id)
        .join(Halaqah, User.halaqah_id == Halaqah.id)
        .where(User.role == UserRole.SANTRI, Halaqah.ustadz_id == ustadz_id)
    )
    return list(hasil.scalars().all())


async def pastikan_akses_santri(db: AsyncSession, user: User, santri_id: uuid.UUID) -> User:
    """Santri hanya dirinya sendiri; ustadz hanya santri di halaqahnya; admin semua."""
    santri = await get_santri_or_404(db, santri_id)
    if user.role == UserRole.ADMIN:
        return santri
    if user.role == UserRole.SANTRI:
        if santri.id == user.id:
            return santri
    elif user.role == UserRole.USTADZ and santri.halaqah_id is not None:
        diampu = (
            await db.execute(
                select(Halaqah.id).where(
                    Halaqah.id == santri.halaqah_id, Halaqah.ustadz_id == user.id
                )
            )
        ).scalar_one_or_none()
        if diampu is not None:
            return santri
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses ke data santri ini.")
