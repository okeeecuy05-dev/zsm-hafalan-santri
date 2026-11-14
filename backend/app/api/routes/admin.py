import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import AdminUser, DbSession
from app.models.enums import UserRole
from app.schemas.admin import (
    DiperbaruiResponse,
    HalaqahAdminRead,
    HalaqahCreate,
    HalaqahUpdate,
    PenggunaCreate,
    PenggunaDibuat,
    PenggunaRead,
    PenggunaUpdate,
    TargetKelas,
    TautanMasuk,
)
from app.services import pengguna_service

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------- pengguna ----------
@router.get("/pengguna", response_model=list[PenggunaRead])
async def daftar_pengguna(
    _: AdminUser,
    db: DbSession,
    role: UserRole | None = None,
    halaqah_id: uuid.UUID | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
) -> list[PenggunaRead]:
    return await pengguna_service.daftar_pengguna(db, role, halaqah_id, q)


@router.post("/pengguna", response_model=PenggunaDibuat, status_code=status.HTTP_201_CREATED)
async def buat_pengguna(payload: PenggunaCreate, _: AdminUser, db: DbSession) -> PenggunaDibuat:
    return await pengguna_service.buat_pengguna(db, payload)


@router.patch("/pengguna/{user_id}", response_model=PenggunaRead)
async def ubah_pengguna(
    user_id: uuid.UUID, payload: PenggunaUpdate, _: AdminUser, db: DbSession
) -> PenggunaRead:
    return await pengguna_service.ubah_pengguna(db, user_id, payload)


@router.delete("/pengguna/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def hapus_pengguna(user_id: uuid.UUID, admin: AdminUser, db: DbSession) -> None:
    await pengguna_service.hapus_pengguna(db, admin, user_id)


@router.post("/pengguna/{user_id}/magic-link", response_model=TautanMasuk)
async def ganti_tautan(user_id: uuid.UUID, admin: AdminUser, db: DbSession) -> TautanMasuk:
    return await pengguna_service.ganti_tautan(db, admin, user_id)


@router.delete("/pengguna/{user_id}/magic-link", status_code=status.HTTP_204_NO_CONTENT)
async def cabut_tautan(user_id: uuid.UUID, admin: AdminUser, db: DbSession) -> None:
    await pengguna_service.cabut_tautan(db, admin, user_id)


# ---------- halaqah ----------
@router.get("/halaqah", response_model=list[HalaqahAdminRead])
async def daftar_halaqah(_: AdminUser, db: DbSession) -> list[HalaqahAdminRead]:
    return await pengguna_service.daftar_halaqah_admin(db)


@router.post("/halaqah", response_model=HalaqahAdminRead, status_code=status.HTTP_201_CREATED)
async def buat_halaqah(payload: HalaqahCreate, _: AdminUser, db: DbSession) -> HalaqahAdminRead:
    return await pengguna_service.buat_halaqah(db, payload)


@router.patch("/halaqah/{halaqah_id}", response_model=HalaqahAdminRead)
async def ubah_halaqah(
    halaqah_id: uuid.UUID, payload: HalaqahUpdate, _: AdminUser, db: DbSession
) -> HalaqahAdminRead:
    return await pengguna_service.ubah_halaqah(db, halaqah_id, payload)


@router.delete("/halaqah/{halaqah_id}", status_code=status.HTTP_204_NO_CONTENT)
async def hapus_halaqah(halaqah_id: uuid.UUID, _: AdminUser, db: DbSession) -> None:
    await pengguna_service.hapus_halaqah(db, halaqah_id)


@router.patch("/halaqah/{halaqah_id}/target", response_model=DiperbaruiResponse)
async def atur_target_kelas(
    halaqah_id: uuid.UUID, payload: TargetKelas, _: AdminUser, db: DbSession
) -> DiperbaruiResponse:
    jumlah = await pengguna_service.atur_target_kelas(db, halaqah_id, payload.target_juz)
    return DiperbaruiResponse(diperbarui=jumlah)
