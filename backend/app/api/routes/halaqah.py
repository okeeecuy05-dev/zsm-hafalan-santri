import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import DbSession, PenilaiUser, tentukan_ustadz_id
from app.models.halaqah import Halaqah
from app.schemas.halaqah import HalaqahRead

router = APIRouter(prefix="/halaqah", tags=["halaqah"])


@router.get("", response_model=list[HalaqahRead])
async def list_halaqah(
    user: PenilaiUser, db: DbSession, ustadz_id: uuid.UUID | None = None
) -> list[Halaqah]:
    """Ustadz: halaqah yang diampunya. Admin: semua (atau difilter ustadz_id)."""
    stmt = select(Halaqah).order_by(Halaqah.nama_kelas)
    filter_ustadz = tentukan_ustadz_id(user, ustadz_id)
    if filter_ustadz is not None:
        stmt = stmt.where(Halaqah.ustadz_id == filter_ustadz)
    result = await db.execute(stmt)
    return list(result.scalars().all())
