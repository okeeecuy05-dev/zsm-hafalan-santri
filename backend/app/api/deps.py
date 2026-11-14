import secrets
import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import PANJANG_PREFIX_HASH, baca_jwt
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User

_bearer = HTTPBearer(auto_error=False)
DbSession = Annotated[AsyncSession, Depends(get_db)]


def _tolak_401(pesan: str) -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED, pesan, headers={"WWW-Authenticate": "Bearer"}
    )


async def get_current_user(
    kredensial: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: DbSession,
) -> User:
    if kredensial is None:
        raise _tolak_401("Belum masuk. Silakan masuk terlebih dahulu.")
    payload = baca_jwt(kredensial.credentials)
    if payload is None:
        raise _tolak_401("Sesi tidak valid atau sudah berakhir. Silakan masuk ulang.")
    try:
        user_id = uuid.UUID(str(payload["sub"]))
    except (KeyError, ValueError):
        raise _tolak_401("Sesi tidak valid. Silakan masuk ulang.") from None

    user = await db.get(User, user_id)
    prefix = (user.magic_link_token or "")[:PANJANG_PREFIX_HASH] if user else ""
    if user is None or not prefix or not secrets.compare_digest(prefix, str(payload.get("mlt", ""))):
        # Pengguna dihapus, atau tautan masuknya diganti/dicabut.
        raise _tolak_401("Sesi tidak berlaku lagi. Silakan masuk ulang.")
    return user


def require_roles(*peran: UserRole):
    async def _dependency(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in peran:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses ke fitur ini.")
        return user

    return _dependency


CurrentUser = Annotated[User, Depends(get_current_user)]
SantriUser = Annotated[User, Depends(require_roles(UserRole.SANTRI))]
PenilaiUser = Annotated[User, Depends(require_roles(UserRole.USTADZ, UserRole.ADMIN))]
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


def tentukan_ustadz_id(user: User, ustadz_id: uuid.UUID | None) -> uuid.UUID | None:
    """Ustadz hanya melihat halaqah miliknya; admin boleh memilih ustadz atau melihat semua."""
    if user.role == UserRole.USTADZ:
        if ustadz_id is not None and ustadz_id != user.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda hanya dapat melihat halaqah Anda sendiri.")
        return user.id
    return ustadz_id
