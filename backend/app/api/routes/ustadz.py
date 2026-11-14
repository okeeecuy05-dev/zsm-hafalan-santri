from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import AdminUser, DbSession
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UstadzRead

router = APIRouter(prefix="/ustadz", tags=["ustadz"])


@router.get("", response_model=list[UstadzRead])
async def list_ustadz(_: AdminUser, db: DbSession) -> list[User]:
    result = await db.execute(
        select(User).where(User.role == UserRole.USTADZ).order_by(User.nama_lengkap)
    )
    return list(result.scalars().all())
