"""Token masuk (Magic Link/QR) dan sesi JWT.

- Token mentah dibuat acak (256 bit) dan hanya ditampilkan sekali kepada admin.
- Database hanya menyimpan hash SHA-256-nya (kolom users.magic_link_token).
- Login menukar token mentah dengan JWT. JWT memuat 16 karakter pertama hash token (klaim "mlt"),
  sehingga mengganti/mencabut token otomatis mematikan semua sesi lama pengguna tersebut.
"""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.core.config import JWT_SECRET_BAWAAN, Settings, settings

ALGORITMA = "HS256"
PANJANG_PREFIX_HASH = 16
logger = logging.getLogger(__name__)


def buat_token_mentah() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()


def buat_tautan(token: str) -> str:
    return f"{settings.frontend_base_url.rstrip('/')}/masuk?token={token}"


def buat_jwt(
    user_id: object, role: str, token_hash: str, sekarang: datetime | None = None
) -> tuple[str, datetime]:
    sekarang = sekarang or datetime.now(timezone.utc)
    kedaluwarsa = sekarang + timedelta(hours=settings.jwt_expire_hours)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "mlt": token_hash[:PANJANG_PREFIX_HASH],
        "iat": sekarang,
        "exp": kedaluwarsa,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITMA), kedaluwarsa


def baca_jwt(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[ALGORITMA],
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError:
        return None


def periksa_keamanan(cfg: Settings = settings) -> None:
    """Dipanggil saat startup. Produksi menolak rahasia bawaan/pendek; development hanya memberi peringatan."""
    lemah = cfg.jwt_secret == JWT_SECRET_BAWAAN or len(cfg.jwt_secret) < 32
    if not lemah:
        return
    if cfg.app_env.lower() == "production":
        raise RuntimeError(
            "JWT_SECRET bawaan atau kurang dari 32 karakter tidak diizinkan saat APP_ENV=production. "
            'Buat dengan: python -c "import secrets; print(secrets.token_urlsafe(48))"'
        )
    logger.warning("JWT_SECRET masih bawaan/lemah. Aman untuk development, WAJIB diganti di produksi.")
