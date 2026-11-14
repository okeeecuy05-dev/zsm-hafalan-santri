import uuid
from datetime import date

from pydantic import BaseModel

from app.models.enums import TipeSesi


class SesiHariIni(BaseModel):
    ziadah: bool
    sabqi: bool
    murajaah: bool


class HariStreak(BaseModel):
    tanggal: date
    jumlah_sesi: int
    lengkap: bool


class StreakResponse(BaseModel):
    santri_id: uuid.UUID
    tanggal: date
    current_streak: int
    highest_streak: int
    hari_ini_lengkap: bool
    # True jika streak masih berjalan (berakhir kemarin) tetapi sesi hari ini belum lengkap.
    terancam: bool
    sesi_hari_ini: SesiHariIni
    sesi_tersisa: list[TipeSesi]
    # 7 hari terakhir, urut dari terlama ke hari ini.
    mingguan: list[HariStreak]
