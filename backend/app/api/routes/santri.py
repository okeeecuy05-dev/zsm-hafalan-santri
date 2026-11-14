import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import DbSession, PenilaiUser, tentukan_ustadz_id
from app.schemas.user import SantriRead
from app.services.santri_query import SantriRow, cari_santri

router = APIRouter(prefix="/santri", tags=["santri"])


@router.get("", response_model=list[SantriRead])
async def list_santri(
    user: PenilaiUser,
    db: DbSession,
    halaqah_id: uuid.UUID | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
) -> list[SantriRow]:
    """Ustadz: santri di halaqahnya. Admin: semua santri."""
    return await cari_santri(db, tentukan_ustadz_id(user, None), halaqah_id, q)
