import base64
import json
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.core.config import JWT_SECRET_BAWAAN, Settings, settings
from app.core.security import (
    ALGORITMA,
    baca_jwt,
    buat_jwt,
    buat_tautan,
    buat_token_mentah,
    hash_token,
    periksa_keamanan,
)


def test_token_mentah_acak_dan_panjang():
    a, b = buat_token_mentah(), buat_token_mentah()
    assert a != b and len(a) >= 40


def test_hash_token_deterministik_dan_membuang_spasi():
    assert hash_token("abc") == hash_token("  abc \n")
    assert len(hash_token("abc")) == 64 and hash_token("abc") != hash_token("abd")


def test_buat_tautan():
    assert buat_tautan("TOK").endswith("/masuk?token=TOK")


def test_jwt_bolak_balik():
    h = hash_token("rahasia")
    token, exp = buat_jwt("11111111-1111-1111-1111-111111111111", "santri", h)
    payload = baca_jwt(token)
    assert payload is not None
    assert payload["sub"] == "11111111-1111-1111-1111-111111111111"
    assert payload["role"] == "santri" and payload["mlt"] == h[:16]
    assert exp > datetime.now(timezone.utc)


def test_jwt_kedaluwarsa_ditolak():
    lampau = datetime.now(timezone.utc) - timedelta(hours=settings.jwt_expire_hours + 1)
    token, _ = buat_jwt("u", "santri", hash_token("x"), sekarang=lampau)
    assert baca_jwt(token) is None


def test_jwt_dimanipulasi_ditolak():
    token, _ = buat_jwt("u", "santri", hash_token("x"))
    kepala, isi, tanda = token.split(".")
    isi_palsu = json.loads(base64.urlsafe_b64decode(isi + "=" * (-len(isi) % 4)))
    isi_palsu["role"] = "admin"
    isi_baru = base64.urlsafe_b64encode(json.dumps(isi_palsu).encode()).rstrip(b"=").decode()
    assert baca_jwt(f"{kepala}.{isi_baru}.{tanda}") is None
    assert baca_jwt(token + "x") is None
    assert baca_jwt("bukan-jwt") is None


def test_jwt_rahasia_berbeda_ditolak():
    token = jwt.encode({"sub": "u", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}, "rahasia-lain-yang-panjang-sekali-xxxx", algorithm=ALGORITMA)
    assert baca_jwt(token) is None


def test_jwt_tanpa_exp_atau_alg_none_ditolak():
    tanpa_exp = jwt.encode({"sub": "u"}, settings.jwt_secret, algorithm=ALGORITMA)
    assert baca_jwt(tanpa_exp) is None
    tanpa_tanda = jwt.encode({"sub": "u", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}, None, algorithm="none")
    assert baca_jwt(tanpa_tanda) is None


def test_periksa_keamanan():
    periksa_keamanan(Settings(app_env="development", jwt_secret=JWT_SECRET_BAWAAN))  # hanya peringatan
    with pytest.raises(RuntimeError):
        periksa_keamanan(Settings(app_env="production", jwt_secret=JWT_SECRET_BAWAAN))
    with pytest.raises(RuntimeError):
        periksa_keamanan(Settings(app_env="production", jwt_secret="pendek"))
    periksa_keamanan(Settings(app_env="production", jwt_secret="x" * 40))
