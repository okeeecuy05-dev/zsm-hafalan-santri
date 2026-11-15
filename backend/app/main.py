import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (mendaftarkan seluruh model ke metadata)
from app.api.router import api_router
from app.core.config import settings
from app.core.security import periksa_keamanan
from app.db.base import Base
from app.db.migrations import jalankan_migrasi
from app.db.session import AsyncSessionLocal, engine
from app.services.badge_service import pastikan_badge_dasar

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    periksa_keamanan()
    if settings.auto_create_tables:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await jalankan_migrasi(conn)
    try:
        async with AsyncSessionLocal() as db:
            await pastikan_badge_dasar(db)
    except Exception:
        logger.exception("Gagal menyiapkan data lencana. Pastikan tabel sudah dimigrasi.")
    yield
    await engine.dispose()


app = FastAPI(title=settings.app_name, version="2.0.0", lifespan=lifespan)
@app.get("/")
def read_root():
    return {"status": "ok", "message": "API ZSM Hafalan Santri Berjalan!"}
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/api/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
