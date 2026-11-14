import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DbSession, PenilaiUser, SantriUser
from app.models.enums import TipeSesi, UserRole
from app.models.setoran_log import SetoranLog
from app.schemas.setoran import (
    AutoFillResponse,
    SetoranCreate,
    SetoranRead,
    SetoranUpdate,
    SetoranValidasi,
)
from app.services import akses, setoran_service

router = APIRouter(prefix="/setoran", tags=["setoran"])


def _tolak_bukan_pemilik() -> HTTPException:
    return HTTPException(status.HTTP_403_FORBIDDEN, "Anda hanya dapat mengelola setoran milik sendiri.")


async def _setoran_milik(db: DbSession, user, setoran_id: uuid.UUID) -> SetoranLog:
    log = await setoran_service.get_setoran_or_404(db, setoran_id)
    if log.santri_id != user.id:
        raise _tolak_bukan_pemilik()
    return log


@router.post("", response_model=SetoranRead, status_code=status.HTTP_201_CREATED)
async def buat_setoran(payload: SetoranCreate, user: SantriUser, db: DbSession) -> SetoranLog:
    if payload.santri_id != user.id:
        raise _tolak_bukan_pemilik()
    return await setoran_service.create_setoran(db, payload)


@router.get("", response_model=list[SetoranRead])
async def daftar_setoran(
    user: CurrentUser,
    db: DbSession,
    santri_id: uuid.UUID | None = None,
    tanggal: date | None = None,
    tipe_sesi: TipeSesi | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[SetoranLog]:
    santri_ids = None
    if user.role == UserRole.SANTRI:
        if santri_id not in (None, user.id):
            raise _tolak_bukan_pemilik()
        santri_id = user.id
    elif santri_id is not None:
        await akses.pastikan_akses_santri(db, user, santri_id)
    elif user.role == UserRole.USTADZ:
        santri_ids = await akses.id_santri_ustadz(db, user.id)
    return await setoran_service.list_setoran(
        db, santri_id, santri_ids, tanggal, tipe_sesi, limit, offset
    )


# Harus dideklarasikan SEBELUM "/{setoran_id}" agar "auto-fill" tidak dibaca sebagai UUID.
@router.get("/auto-fill", response_model=AutoFillResponse)
async def auto_fill_sabqi(
    user: CurrentUser, db: DbSession, santri_id: uuid.UUID, tanggal: date | None = None
) -> AutoFillResponse:
    await akses.pastikan_akses_santri(db, user, santri_id)
    return await setoran_service.build_auto_fill(db, santri_id, tanggal)


@router.get("/{setoran_id}", response_model=SetoranRead)
async def detail_setoran(setoran_id: uuid.UUID, user: CurrentUser, db: DbSession) -> SetoranLog:
    log = await setoran_service.get_setoran_or_404(db, setoran_id)
    await akses.pastikan_akses_santri(db, user, log.santri_id)
    return log


@router.patch("/{setoran_id}", response_model=SetoranRead)
async def ubah_setoran(
    setoran_id: uuid.UUID, payload: SetoranUpdate, user: SantriUser, db: DbSession
) -> SetoranLog:
    await _setoran_milik(db, user, setoran_id)
    return await setoran_service.update_setoran(db, setoran_id, payload)


@router.patch("/{setoran_id}/validasi", response_model=SetoranRead)
async def validasi_setoran(
    setoran_id: uuid.UUID, payload: SetoranValidasi, user: PenilaiUser, db: DbSession
) -> SetoranLog:
    log = await setoran_service.get_setoran_or_404(db, setoran_id)
    await akses.pastikan_akses_santri(db, user, log.santri_id)
    return await setoran_service.validasi_setoran(db, setoran_id, payload)


@router.delete("/{setoran_id}", status_code=status.HTTP_204_NO_CONTENT)
async def hapus_setoran(setoran_id: uuid.UUID, user: SantriUser, db: DbSession) -> None:
    await _setoran_milik(db, user, setoran_id)
    await setoran_service.delete_setoran(db, setoran_id)
