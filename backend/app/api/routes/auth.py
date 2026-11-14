from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.core.security import buat_jwt, hash_token
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserMe

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: DbSession) -> LoginResponse:
    """Tukar token Magic Link/QR dengan sesi (JWT). Token tidak dikonsumsi: QR kartu dapat dipakai berulang."""
    hashed = hash_token(payload.token)
    user = (
        await db.execute(select(User).where(User.magic_link_token == hashed))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Tautan atau QR tidak valid, atau sudah diganti. Minta tautan baru kepada admin.",
        )
    jwt_str, kedaluwarsa = buat_jwt(user.id, user.role.value, hashed)
    return LoginResponse(
        access_token=jwt_str, expires_at=kedaluwarsa, user=UserMe.model_validate(user)
    )


@router.get("/me", response_model=UserMe)
async def saya(user: CurrentUser) -> User:
    return user
