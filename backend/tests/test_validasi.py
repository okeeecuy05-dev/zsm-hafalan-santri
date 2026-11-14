import pytest
from pydantic import ValidationError

from app.schemas.setoran import SetoranValidasi


@pytest.mark.parametrize("rating", [1, 3, 5])
def test_rating_valid(rating):
    assert SetoranValidasi(rating=rating).rating == rating


@pytest.mark.parametrize("rating", [0, 6, -1])
def test_rating_di_luar_1_sampai_5_ditolak(rating):
    with pytest.raises(ValidationError):
        SetoranValidasi(rating=rating)


def test_rating_wajib():
    with pytest.raises(ValidationError):
        SetoranValidasi()  # type: ignore[call-arg]


def test_catatan_dirapikan():
    assert SetoranValidasi(rating=4, catatan_ustadz="  Perbaiki mad.  ").catatan_ustadz == "Perbaiki mad."


@pytest.mark.parametrize("catatan", [None, "", "   "])
def test_catatan_kosong_menjadi_none(catatan):
    assert SetoranValidasi(rating=4, catatan_ustadz=catatan).catatan_ustadz is None


def test_catatan_terlalu_panjang_ditolak():
    with pytest.raises(ValidationError):
        SetoranValidasi(rating=4, catatan_ustadz="x" * 1001)
