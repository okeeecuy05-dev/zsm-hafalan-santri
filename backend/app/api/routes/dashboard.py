import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import DbSession, PenilaiUser, tentukan_ustadz_id
from app.schemas.dashboard import DashboardUstadzResponse
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/ustadz", response_model=DashboardUstadzResponse)
async def dashboard_ustadz(
    user: PenilaiUser,
    db: DbSession,
    tanggal: date | None = None,
    ustadz_id: uuid.UUID | None = None,
    halaqah_id: uuid.UUID | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
) -> DashboardUstadzResponse:
    """Ustadz melihat santri halaqahnya sendiri; admin melihat semua (atau difilter ustadz_id)."""
    return await dashboard_service.bangun_dashboard(
        db, tanggal, tentukan_ustadz_id(user, ustadz_id), halaqah_id, q
    )
