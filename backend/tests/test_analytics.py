import uuid
from datetime import date, timedelta

import pytest

from app.core.quran_meta import TOTAL_AYAT, ayat_untuk_juz
from app.schemas.analytics import StatusPrediksi
from app.services.analytics_service import (
    LogZiadah,
    ayat_baru,
    gabung,
    hitung_analitik,
    hitung_grafik,
    irisan_panjang,
    panjang,
    susun_ringkasan,
)
from app.services.santri_query import SantriRow

HARI = date(2026, 11, 9)


def buat_logs(spec: list[tuple[int, int]], mulai: int = 1) -> list[LogZiadah]:
    """spec: [(hari_lalu, jumlah_ayat)] diurutkan dari yang terlama. Ayat berurutan tanpa tumpang tindih."""
    logs, penunjuk = [], mulai
    for hari_lalu, jumlah in spec:
        logs.append(LogZiadah(HARI - timedelta(days=hari_lalu), penunjuk, penunjuk + jumlah - 1))
        penunjuk += jumlah
    return logs


def harian(dari: int, sampai: int, per_hari: int, mulai: int = 1) -> list[LogZiadah]:
    """Setoran `per_hari` ayat setiap hari dari `dari` hari lalu hingga `sampai` hari lalu (inklusif)."""
    return buat_logs([(h, per_hari) for h in range(dari, sampai - 1, -1)], mulai)


# ---------- interval ----------
def test_gabung_dan_panjang():
    assert gabung([(6, 10), (1, 5)]) == [(1, 10)]  # bersambung
    assert gabung([(1, 5), (3, 8)]) == [(1, 8)]  # tumpang tindih
    assert gabung([(1, 3), (10, 12)]) == [(1, 3), (10, 12)]  # terpisah
    assert gabung([(1, 10), (2, 3)]) == [(1, 10)]  # terkandung
    assert panjang([(1, 3), (10, 12)]) == 6
    assert gabung([]) == [] and panjang([]) == 0


def test_irisan():
    assert irisan_panjang([(1, 10)], [(5, 15)]) == 6
    assert irisan_panjang([(1, 3), (10, 12)], [(2, 11)]) == 4
    assert irisan_panjang([(1, 3)], [(4, 9)]) == 0
    assert irisan_panjang([], [(1, 2)]) == 0


def test_ayat_untuk_juz():
    assert TOTAL_AYAT == 6236
    assert ayat_untuk_juz(0) == 0
    assert ayat_untuk_juz(1) == 208
    assert ayat_untuk_juz(5) == 1040
    assert ayat_untuk_juz(30) == 6236
    with pytest.raises(ValueError):
        ayat_untuk_juz(31)


def test_ayat_baru_tidak_menghitung_ulang_ayat_lama():
    logs = [LogZiadah(HARI - timedelta(days=100), 1, 50), LogZiadah(HARI - timedelta(days=2), 41, 70)]
    # jendela 7 hari: 41-70 (30 ayat) tetapi 41-50 sudah ada sebelumnya -> 20 baru
    assert ayat_baru(logs, HARI - timedelta(days=6), HARI) == 20


# ---------- prediksi ----------
def test_prediksi_kecepatan_stabil():
    logs = harian(29, 0, 10)  # 30 hari x 10 ayat
    h = hitung_analitik(logs, 0, 30, HARI)
    assert h.ayat_terekam == 300 and h.total_hafal_ayat == 300
    assert h.avg_ayat_per_hari == 10.0 and h.jendela_hari == 30
    assert h.sisa_ayat == 6236 - 300
    assert h.status_prediksi == StatusPrediksi.TERPREDIKSI
    assert h.hari_menuju_khatam == 594  # ceil(5936 / 10)
    assert h.estimasi_khatam == HARI + timedelta(days=594)
    assert h.melambat is False
    assert h.tidak_aktif_hari == 0


def test_hafalan_awal_dihitung_dan_dibatasi_total_ayat():
    logs = harian(9, 0, 10)
    assert hitung_analitik(logs, 1000, 30, HARI).total_hafal_ayat == 1100
    assert hitung_analitik(logs, TOTAL_AYAT, 30, HARI).total_hafal_ayat == TOTAL_AYAT


def test_tanpa_riwayat():
    h = hitung_analitik([], 0, 30, HARI)
    assert h.status_prediksi == StatusPrediksi.BELUM_ADA_DATA
    assert h.avg_ayat_per_hari is None and h.estimasi_khatam is None
    assert h.tidak_aktif_hari is None and h.melambat is False


def test_riwayat_lama_tanpa_kemajuan_di_jendela():
    logs = buat_logs([(80, 20), (79, 20)])
    h = hitung_analitik(logs, 0, 30, HARI)
    assert h.status_prediksi == StatusPrediksi.TIDAK_AKTIF
    assert h.avg_ayat_per_hari is None and h.tidak_aktif_hari == 79


def test_target_tercapai():
    logs = buat_logs([(3, 208)])
    h = hitung_analitik(logs, 0, 1, HARI)
    assert h.status_prediksi == StatusPrediksi.TERCAPAI
    assert h.estimasi_khatam is None and h.hari_menuju_khatam == 0
    assert h.sisa_ayat == 0 and h.persen_target == 100.0


def test_terlalu_jauh_tidak_overflow():
    logs = buat_logs([(29, 1)])  # hanya 1 ayat dalam 30 hari
    h = hitung_analitik(logs, 0, 30, HARI)
    assert h.status_prediksi == StatusPrediksi.TERLALU_JAUH
    assert h.estimasi_khatam is None


def test_riwayat_pendek_jendela_dipendekkan():
    logs = harian(3, 0, 10)  # baru mulai 3 hari lalu
    h = hitung_analitik(logs, 0, 30, HARI)
    assert h.jendela_hari == 4 and h.avg_ayat_per_hari == 10.0


def test_ayat_sama_disetor_dua_kali_dihitung_sekali():
    logs = [LogZiadah(HARI - timedelta(days=2), 1, 10), LogZiadah(HARI - timedelta(days=1), 1, 10)]
    h = hitung_analitik(logs, 0, 30, HARI)
    assert h.ayat_terekam == 10


def test_persen_target():
    h = hitung_analitik(buat_logs([(1, 104)]), 0, 1, HARI)  # 104 dari 208
    assert h.persen_target == 50.0
    assert h.juz_hafal == round(104 / 6236 * 30, 1)


# ---------- melambat ----------
def test_melambat_terdeteksi():
    logs = harian(39, 7, 10) + harian(6, 0, 1, mulai=2000)
    h = hitung_analitik(logs, 0, 30, HARI)
    assert h.melambat is True
    assert h.kecepatan_7_hari == 1.0 and h.kecepatan_pembanding == 10.0
    assert h.persen_penurunan == 90


def test_berhenti_total_juga_melambat():
    logs = harian(39, 7, 10)  # tidak ada setoran 7 hari terakhir
    h = hitung_analitik(logs, 0, 30, HARI)
    assert h.melambat is True and h.persen_penurunan == 100 and h.tidak_aktif_hari == 7


def test_tidak_melambat_jika_stabil():
    assert hitung_analitik(harian(39, 0, 10), 0, 30, HARI).melambat is False


def test_batas_ambang_tepat_tidak_dianggap_melambat():
    # pembanding 10/hari, 7 hari terakhir 5/hari = tepat 50% -> bukan "turun lebih dari 50%"
    assert hitung_analitik(harian(39, 7, 10) + harian(6, 0, 5, mulai=3000), 0, 30, HARI).melambat is False
    assert hitung_analitik(harian(39, 7, 10) + harian(6, 0, 4, mulai=3000), 0, 30, HARI).melambat is True


def test_santri_baru_belum_dinilai_melambat():
    logs = harian(10, 7, 10)  # baru 10 hari lalu, lalu berhenti
    assert hitung_analitik(logs, 0, 30, HARI).melambat is False


def test_target_tercapai_tidak_memicu_peringatan():
    logs = harian(39, 7, 10)  # 330 ayat
    assert hitung_analitik(logs, 0, 1, HARI).melambat is False


# ---------- grafik ----------
def test_grafik_kumulatif():
    logs = buat_logs([(100, 50), (5, 10), (2, 10)])
    g = hitung_grafik(logs, 100, HARI, 10)
    assert len(g) == 10
    assert g[0].tanggal == HARI - timedelta(days=9) and g[-1].tanggal == HARI
    nilai = [t.kumulatif_ayat for t in g]
    assert nilai == sorted(nilai)
    assert nilai[0] == 150  # 100 awal + 50 sebelum jendela
    assert nilai[4] == 160  # hari ke-5 lalu menambah 10
    assert nilai[-1] == 170


def test_grafik_dibatasi_total_ayat():
    g = hitung_grafik([], TOTAL_AYAT + 500, HARI, 7)
    assert all(t.kumulatif_ayat == TOTAL_AYAT for t in g)


# ---------- ringkasan ustadz ----------
def test_ringkasan_urut_melambat_dulu_dan_default_profil():
    a = SantriRow(uuid.uuid4(), "Budi", None, None)
    b = SantriRow(uuid.uuid4(), "Andi", None, None)
    c = SantriRow(uuid.uuid4(), "Citra", None, "Al-Fatih")
    logs_map = {a.id: harian(39, 7, 10), b.id: harian(39, 0, 10)}  # Budi melambat
    r = susun_ringkasan([b, c, a], logs_map, {c.id: (5, 100)}, HARI)
    assert [x.nama_lengkap for x in r.santri] == ["Budi", "Andi", "Citra"]
    assert r.jumlah_melambat == 1
    assert r.santri[2].analitik.target_juz == 5 and r.santri[2].analitik.hafalan_awal_ayat == 100
    assert r.santri[1].analitik.target_juz == 30 and r.santri[1].analitik.hafalan_awal_ayat == 0
