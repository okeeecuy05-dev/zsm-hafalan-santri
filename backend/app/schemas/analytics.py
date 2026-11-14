import enum
import uuid
from datetime import date

from pydantic import BaseModel


class StatusPrediksi(str, enum.Enum):
    TERCAPAI = "tercapai"
    TERPREDIKSI = "terprediksi"
    BELUM_ADA_DATA = "belum_ada_data"  # belum pernah ada Ziadah terverifikasi
    TIDAK_AKTIF = "tidak_aktif"  # ada riwayat, tetapi tidak ada kemajuan dalam jendela hitung
    TERLALU_JAUH = "terlalu_jauh"  # estimasi lebih dari 100 tahun


class AnalitikSantri(BaseModel):
    target_juz: int
    hafalan_awal_ayat: int
    ayat_terekam: int
    total_hafal_ayat: int
    juz_hafal: float
    target_ayat: int
    sisa_ayat: int
    persen_target: float
    avg_ayat_per_hari: float | None
    jendela_hari: int
    status_prediksi: StatusPrediksi
    estimasi_khatam: date | None
    hari_menuju_khatam: int | None
    kecepatan_7_hari: float
    kecepatan_pembanding: float
    melambat: bool
    persen_penurunan: int | None
    tidak_aktif_hari: int | None


class TitikGrafik(BaseModel):
    tanggal: date
    kumulatif_ayat: int


class BadgeStatus(BaseModel):
    id: uuid.UUID
    nama_badge: str
    kriteria_pencapaian: str
    juz: int
    ambang_ayat: int
    diperoleh: bool
    tanggal_didapat: date | None
    baru: bool


class RingkasAnalitikSantri(BaseModel):
    santri_id: uuid.UUID
    nama_lengkap: str
    halaqah_id: uuid.UUID | None
    nama_halaqah: str | None
    analitik: AnalitikSantri


class AnalitikUstadzResponse(BaseModel):
    tanggal: date
    jumlah_melambat: int
    santri: list[RingkasAnalitikSantri]


class ProfilSantriResponse(BaseModel):
    santri_id: uuid.UUID
    nama_lengkap: str
    nama_halaqah: str | None
    tanggal: date
    analitik: AnalitikSantri
    grafik: list[TitikGrafik]
    badges: list[BadgeStatus]


class DitandaiResponse(BaseModel):
    ditandai: int
