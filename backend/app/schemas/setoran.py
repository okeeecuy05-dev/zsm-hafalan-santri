import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.quran_meta import JUMLAH_SURAH, validasi_rentang
from app.models.enums import StatusSetoran, TipeSesi


class SetoranCreate(BaseModel):
    santri_id: uuid.UUID
    tipe_sesi: TipeSesi
    tanggal: date | None = None
    surah_awal: int = Field(ge=1, le=JUMLAH_SURAH)
    ayat_awal: int = Field(ge=1)
    surah_akhir: int = Field(ge=1, le=JUMLAH_SURAH)
    ayat_akhir: int = Field(ge=1)

    @model_validator(mode="after")
    def cek_rentang(self) -> "SetoranCreate":
        validasi_rentang(self.surah_awal, self.ayat_awal, self.surah_akhir, self.ayat_akhir)
        return self


class SetoranUpdate(BaseModel):
    tipe_sesi: TipeSesi | None = None
    tanggal: date | None = None
    surah_awal: int | None = Field(default=None, ge=1, le=JUMLAH_SURAH)
    ayat_awal: int | None = Field(default=None, ge=1)
    surah_akhir: int | None = Field(default=None, ge=1, le=JUMLAH_SURAH)
    ayat_akhir: int | None = Field(default=None, ge=1)


class SetoranValidasi(BaseModel):
    """Penilaian ustadz atas satu setoran. Memanggil endpoint ini otomatis memverifikasi setoran."""

    rating: int = Field(ge=1, le=5)
    catatan_ustadz: str | None = Field(default=None, max_length=1000)

    @field_validator("catatan_ustadz")
    @classmethod
    def rapikan_catatan(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None


class SetoranRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    santri_id: uuid.UUID
    tipe_sesi: TipeSesi
    tanggal: date
    surah_awal: int
    ayat_awal: int
    surah_akhir: int
    ayat_akhir: int
    status: StatusSetoran
    rating: int | None
    catatan_ustadz: str | None
    created_at: datetime
    updated_at: datetime


class SegmenAyat(BaseModel):
    surah_awal: int
    ayat_awal: int
    surah_akhir: int
    ayat_akhir: int


class AutoFillResponse(BaseModel):
    tersedia: bool
    tanggal: date
    segmen: list[SegmenAyat]
