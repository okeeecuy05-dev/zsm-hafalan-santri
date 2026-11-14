import uuid
from datetime import date, timedelta

from app.models.enums import TipeSesi
from app.services.streak_service import (
    HasilStreak,
    hitung_streak,
    susun_respons,
    tanggal_lengkap_dari,
)

HARI = date(2026, 11, 8)
SANTRI = uuid.uuid4()
SEMUA = {TipeSesi.ZIADAH, TipeSesi.SABQI, TipeSesi.MURAJAAH}


def mundur(n: int) -> date:
    return HARI - timedelta(days=n)


def test_kosong():
    assert hitung_streak([], HARI) == HasilStreak(0, 0, None)


def test_streak_berakhir_hari_ini():
    hasil = hitung_streak([mundur(2), mundur(1), mundur(0)], HARI)
    assert (hasil.current, hasil.highest, hasil.terakhir_lengkap) == (3, 3, HARI)


def test_streak_berakhir_kemarin_belum_putus():
    hasil = hitung_streak([mundur(4), mundur(3), mundur(2), mundur(1)], HARI)
    assert (hasil.current, hasil.highest) == (4, 4)


def test_streak_putus_jika_kemarin_dan_hari_ini_kosong():
    hasil = hitung_streak([mundur(5), mundur(4), mundur(3)], HARI)
    assert (hasil.current, hasil.highest, hasil.terakhir_lengkap) == (0, 3, mundur(3))


def test_highest_dari_rangkaian_lama():
    lama = [mundur(n) for n in range(20, 10, -1)]  # 10 hari
    baru = [mundur(1), mundur(0)]
    hasil = hitung_streak(lama + baru, HARI)
    assert (hasil.current, hasil.highest) == (2, 10)


def test_lubang_satu_hari_memutus_rangkaian():
    hasil = hitung_streak([mundur(3), mundur(2), mundur(0)], HARI)
    assert (hasil.current, hasil.highest) == (1, 2)


def test_tanggal_duplikat_tidak_menggandakan():
    hasil = hitung_streak([mundur(1), mundur(1), mundur(0), mundur(0)], HARI)
    assert hasil.current == 2


def test_tanggal_lengkap_butuh_tiga_sesi():
    peta = {
        mundur(2): {TipeSesi.ZIADAH, TipeSesi.SABQI},
        mundur(1): set(SEMUA),
        mundur(0): {TipeSesi.MURAJAAH},
    }
    assert tanggal_lengkap_dari(peta) == [mundur(1)]


def test_respons_terancam_saat_streak_berjalan_tapi_hari_ini_belum_lengkap():
    peta = {mundur(2): set(SEMUA), mundur(1): set(SEMUA), HARI: {TipeSesi.ZIADAH}}
    hasil = hitung_streak(tanggal_lengkap_dari(peta), HARI)
    r = susun_respons(SANTRI, HARI, peta, hasil)
    assert r.current_streak == 2
    assert r.terancam is True
    assert r.hari_ini_lengkap is False
    assert r.sesi_hari_ini.ziadah and not r.sesi_hari_ini.sabqi and not r.sesi_hari_ini.murajaah
    assert r.sesi_tersisa == [TipeSesi.SABQI, TipeSesi.MURAJAAH]


def test_respons_hari_ini_lengkap_tidak_terancam():
    peta = {mundur(1): set(SEMUA), HARI: set(SEMUA)}
    hasil = hitung_streak(tanggal_lengkap_dari(peta), HARI)
    r = susun_respons(SANTRI, HARI, peta, hasil)
    assert (r.current_streak, r.terancam, r.hari_ini_lengkap, r.sesi_tersisa) == (2, False, True, [])


def test_respons_tanpa_riwayat():
    r = susun_respons(SANTRI, HARI, {}, hitung_streak([], HARI))
    assert (r.current_streak, r.highest_streak, r.terancam) == (0, 0, False)
    assert len(r.sesi_tersisa) == 3


def test_mingguan_tujuh_hari_urut_lama_ke_baru():
    peta = {mundur(6): {TipeSesi.ZIADAH}, HARI: set(SEMUA)}
    r = susun_respons(SANTRI, HARI, peta, hitung_streak(tanggal_lengkap_dari(peta), HARI))
    assert len(r.mingguan) == 7
    assert r.mingguan[0].tanggal == mundur(6) and r.mingguan[0].jumlah_sesi == 1
    assert r.mingguan[-1].tanggal == HARI and r.mingguan[-1].lengkap is True
