import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DbSession, PenilaiUser, SantriUser, tentukan_ustadz_id
from app.schemas.analytics import (
    AnalitikUstadzResponse,
    BadgeStatus,
    DitandaiResponse,
    ProfilSantriResponse,
)
from app.services import akses, analytics_service, badge_service

router = APIRouter(prefix="/analytics", tags=["analytics"])
Cari = Annotated[str | None, Query(max_length=100)]


@router.get("/ustadz", response_model=AnalitikUstadzResponse)
async def analitik_ustadz(
    user: PenilaiUser,
    db: DbSession,
    ustadz_id: uuid.UUID | None = None,
    halaqah_id: uuid.UUID | None = None,
    q: Cari = None,
) -> AnalitikUstadzResponse:
    """Prediksi khatam seluruh santri (melambat di urutan teratas)."""
    return await analytics_service.bangun_analitik_ustadz(
        db, tentukan_ustadz_id(user, ustadz_id), halaqah_id, q
    )


@router.get("/melambat", response_model=AnalitikUstadzResponse)
async def santri_melambat(
    user: PenilaiUser,
    db: DbSession,
    ustadz_id: uuid.UUID | None = None,
    halaqah_id: uuid.UUID | None = None,
    q: Cari = None,
) -> AnalitikUstadzResponse:
    """Hanya santri yang kecepatan hafalannya turun jauh."""
    hasil = await analytics_service.bangun_analitik_ustadz(
        db, tentukan_ustadz_id(user, ustadz_id), halaqah_id, q
    )
    return hasil.model_copy(update={"santri": [s for s in hasil.santri if s.analitik.melambat]})


@router.get("/santri/{santri_id}", response_model=ProfilSantriResponse)
async def profil_santri(
    santri_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    hari: Annotated[int, Query(ge=7, le=365)] = 90,
) -> ProfilSantriResponse:
    await akses.pastikan_akses_santri(db, user, santri_id)
    return await analytics_service.bangun_profil(db, santri_id, hari)


@router.get("/santri/{santri_id}/badges", response_model=list[BadgeStatus])
async def daftar_badge(santri_id: uuid.UUID, user: CurrentUser, db: DbSession) -> list[BadgeStatus]:
    await akses.pastikan_akses_santri(db, user, santri_id)
    return await badge_service.daftar_badge_santri(db, santri_id)


@router.post("/santri/{santri_id}/badges/dilihat", response_model=DitandaiResponse)
async def tandai_badge_dilihat(
    santri_id: uuid.UUID, user: SantriUser, db: DbSession
) -> DitandaiResponse:
    if santri_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Hanya pemilik lencana yang dapat menandainya.")
    return DitandaiResponse(ditandai=await badge_service.tandai_dilihat(db, santri_id))
