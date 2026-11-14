import enum
import uuid
from datetime import date

from pydantic import BaseModel


class StatusSesi(str, enum.Enum):
    BELUM = "belum"
    MENUNGGU = "menunggu"
    TERVERIFIKASI = "terverifikasi"


class Indikator(str, enum.Enum):
    HIJAU = "hijau"
    KUNING = "kuning"
    MERAH = "merah"


class SelSesi(BaseModel):
    status: StatusSesi
    jumlah_setoran: int


class MatriksSesi(BaseModel):
    ziadah: SelSesi
    sabqi: SelSesi
    murajaah: SelSesi


class BarisSantri(BaseModel):
    santri_id: uuid.UUID
    nama_lengkap: str
    halaqah_id: uuid.UUID | None
    nama_halaqah: str | None
    peringkat: int
    sesi: MatriksSesi
    jumlah_sesi: int
    menunggu_validasi: int
    indikator: Indikator


class RingkasanDashboard(BaseModel):
    total_santri: int
    hijau: int
    kuning: int
    merah: int
    menunggu_validasi: int


class DashboardUstadzResponse(BaseModel):
    tanggal: date
    ringkasan: RingkasanDashboard
    santri: list[BarisSantri]
