import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.core.quran_meta import JUMLAH_JUZ, TOTAL_AYAT
from app.models.enums import UserRole

Nama150 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
Nama100 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class PenggunaRead(BaseModel):
    id: uuid.UUID
    nama_lengkap: str
    role: UserRole
    halaqah_id: uuid.UUID | None
    nama_halaqah: str | None
    target_juz: int | None
    hafalan_awal_ayat: int | None
    punya_tautan: bool
    created_at: datetime


class PenggunaCreate(BaseModel):
    nama_lengkap: Nama150
    role: UserRole
    halaqah_id: uuid.UUID | None = None
    target_juz: int = Field(default=JUMLAH_JUZ, ge=1, le=JUMLAH_JUZ)
    hafalan_awal_ayat: int = Field(default=0, ge=0, le=TOTAL_AYAT)


class PenggunaUpdate(BaseModel):
    nama_lengkap: Nama150 | None = None
    halaqah_id: uuid.UUID | None = None  # dibedakan dari "tidak dikirim" lewat model_fields_set
    target_juz: int | None = Field(default=None, ge=1, le=JUMLAH_JUZ)
    hafalan_awal_ayat: int | None = Field(default=None, ge=0, le=TOTAL_AYAT)


class TautanMasuk(BaseModel):
    token: str
    magic_link: str


class PenggunaDibuat(BaseModel):
    pengguna: PenggunaRead
    tautan: TautanMasuk


class HalaqahAdminRead(BaseModel):
    id: uuid.UUID
    nama_kelas: str
    ustadz_id: uuid.UUID | None
    nama_ustadz: str | None
    jumlah_santri: int


class HalaqahCreate(BaseModel):
    nama_kelas: Nama100
    ustadz_id: uuid.UUID | None = None


class HalaqahUpdate(BaseModel):
    nama_kelas: Nama100 | None = None
    ustadz_id: uuid.UUID | None = None  # dibedakan dari "tidak dikirim" lewat model_fields_set


class TargetKelas(BaseModel):
    target_juz: int = Field(ge=1, le=JUMLAH_JUZ)


class DiperbaruiResponse(BaseModel):
    diperbarui: int
