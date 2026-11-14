import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.streak import StreakResponse
from app.services import akses, streak_service

router = APIRouter(prefix="/streak", tags=["streak"])


@router.get("/{santri_id}", response_model=StreakResponse)
async def ambil_streak(santri_id: uuid.UUID, user: CurrentUser, db: DbSession) -> StreakResponse:
    await akses.pastikan_akses_santri(db, user, santri_id)
    return await streak_service.hitung_dan_simpan(db, santri_id)
