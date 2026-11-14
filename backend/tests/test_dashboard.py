import uuid
from datetime import date

from app.models.enums import StatusSetoran, TipeSesi
from app.schemas.dashboard import Indikator, StatusSesi
from app.services.dashboard_service import indikator_dari, sel_dari, susun_dashboard
from app.services.santri_query import SantriRow, _pola_ilike

HARI = date(2026, 11, 9)
P, V = StatusSetoran.PENDING, StatusSetoran.VERIFIED
Z, S, M = TipeSesi.ZIADAH, TipeSesi.SABQI, TipeSesi.MURAJAAH


def santri(nama: str, halaqah: str | None = "Al-Fatih") -> SantriRow:
    return SantriRow(uuid.uuid4(), nama, uuid.uuid4() if halaqah else None, halaqah)


def test_indikator():
    assert indikator_dari(0) == Indikator.MERAH
    assert indikator_dari(1) == Indikator.KUNING
    assert indikator_dari(2) == Indikator.KUNING
    assert indikator_dari(3) == Indikator.HIJAU


def test_sel_dari():
    assert sel_dari([]).status == StatusSesi.BELUM
    assert sel_dari([V, V]).status == StatusSesi.TERVERIFIKASI
    campur = sel_dari([V, P])
    assert campur.status == StatusSesi.MENUNGGU and campur.jumlah_setoran == 2


def test_dashboard_kosong():
    r = susun_dashboard(HARI, [], [])
    assert r.santri == []
    assert (r.ringkasan.total_santri, r.ringkasan.hijau, r.ringkasan.menunggu_validasi) == (0, 0, 0)


def test_matriks_indikator_dan_ringkasan():
    a, b, c = santri("Ahmad"), santri("Budi"), santri("Cahya")
    logs = [
        (a.id, Z, V), (a.id, S, P), (a.id, M, P),   # a: lengkap, 2 menunggu
        (b.id, Z, P),                               # b: sebagian, 1 menunggu
    ]
    r = susun_dashboard(HARI, [c, b, a], logs)
    urut = {x.nama_lengkap: x for x in r.santri}

    assert urut["Ahmad"].indikator == Indikator.HIJAU
    assert urut["Ahmad"].sesi.ziadah.status == StatusSesi.TERVERIFIKASI
    assert urut["Ahmad"].sesi.sabqi.status == StatusSesi.MENUNGGU
    assert urut["Ahmad"].menunggu_validasi == 2
    assert urut["Budi"].indikator == Indikator.KUNING
    assert urut["Budi"].sesi.sabqi.status == StatusSesi.BELUM
    assert urut["Cahya"].indikator == Indikator.MERAH

    assert r.ringkasan.model_dump() == {
        "total_santri": 3, "hijau": 1, "kuning": 1, "merah": 1, "menunggu_validasi": 3,
    }


def test_klasemen_urut_dan_peringkat_seri():
    a, b, c, d = santri("Dani"), santri("Bayu"), santri("Citra"), santri("Alif")
    logs = [
        (a.id, Z, P), (a.id, S, P), (a.id, M, P),   # Dani: 3
        (b.id, Z, P), (b.id, S, P),                 # Bayu: 2
        (c.id, Z, P), (c.id, S, P),                 # Citra: 2
    ]                                                # Alif: 0
    r = susun_dashboard(HARI, [a, b, c, d], logs)
    assert [x.nama_lengkap for x in r.santri] == ["Dani", "Bayu", "Citra", "Alif"]
    assert [x.peringkat for x in r.santri] == [1, 2, 2, 4]


def test_banyak_setoran_pada_sesi_sama_dihitung_satu_sesi():
    a = santri("Ahmad")
    r = susun_dashboard(HARI, [a], [(a.id, Z, V), (a.id, Z, P)])
    baris = r.santri[0]
    assert baris.jumlah_sesi == 1
    assert baris.sesi.ziadah.jumlah_setoran == 2
    assert baris.sesi.ziadah.status == StatusSesi.MENUNGGU


def test_log_santri_lain_diabaikan():
    a = santri("Ahmad")
    r = susun_dashboard(HARI, [a], [(uuid.uuid4(), Z, P)])
    assert r.santri[0].indikator == Indikator.MERAH


def test_santri_tanpa_halaqah():
    a = santri("Ahmad", halaqah=None)
    r = susun_dashboard(HARI, [a], [])
    assert r.santri[0].halaqah_id is None and r.santri[0].nama_halaqah is None


def test_pola_ilike_meng_escape_karakter_khusus():
    assert _pola_ilike("ab") == "%ab%"
    assert _pola_ilike("100%") == "%100\\%%"
    assert _pola_ilike("a_b") == "%a\\_b%"
    assert _pola_ilike("a\\b") == "%a\\\\b%"
