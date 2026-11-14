from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

JWT_SECRET_BAWAAN = "ganti-rahasia-ini-di-produksi-minimal-32-karakter"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ZSM Hafalan Santri API"
    app_env: str = "development"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/zsm_hafalan"
    cors_origins: list[str] = ["http://localhost:3000"]
    timezone: str = "Asia/Jakarta"
    auto_create_tables: bool = True
    db_echo: bool = False

    jwt_secret: str = JWT_SECRET_BAWAAN
    jwt_expire_hours: int = 24 * 30
    frontend_base_url: str = "http://localhost:3000"

    analitik_jendela_hari: int = 30
    melambat_ambang: float = 0.5
    melambat_min_hari_data: int = 14

    @field_validator("database_url")
    @classmethod
    def normalisasi_database_url(cls, v: str) -> str:
        # Supabase/Neon memberi URL "postgresql://..."; SQLAlchemy async butuh driver asyncpg.
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        # asyncpg memakai parameter "ssl", bukan "sslmode"; channel_binding tidak didukung.
        v = v.replace("sslmode=", "ssl=")
        return v.replace("&channel_binding=require", "").replace("channel_binding=require&", "")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
