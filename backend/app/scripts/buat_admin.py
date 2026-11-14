"""Membuat admin baru, atau mengganti tautan masuk admin yang sudah ada.

Pemakaian:  python -m app.scripts.buat_admin "Nama Admin"

Berguna untuk (1) admin pertama pada database dari Fase 1-3, dan (2) admin yang kehilangan tautannya.
Mengganti tautan otomatis mematikan sesi lama admin tersebut.
"""
import asyncio
import sys

from sqlalchemy import select

from app import models  # noqa: F401
from app.core.security import buat_tautan, buat_token_mentah, hash_token
from app.db.base import Base
from app.db.migrations import jalankan_migrasi
from app.db.session import AsyncSessionLocal, engine
from app.models import User, UserRole
from app.services.badge_service import pastikan_badge_dasar


async def main(nama: str) -> str:
    nama = nama.strip()
    if not nama:
        raise SystemExit('Nama tidak boleh kosong. Contoh: python -m app.scripts.buat_admin "Admin ZSM"')

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await jalankan_migrasi(conn)

    async with AsyncSessionLocal() as db:
        await pastikan_badge_dasar(db)
        admin = (
            await db.execute(select(User).where(User.role == UserRole.ADMIN, User.nama_lengkap == nama))
        ).scalar_one_or_none()
        baru = admin is None
        if admin is None:
            admin = User(nama_lengkap=nama, role=UserRole.ADMIN)
            db.add(admin)
        token = buat_token_mentah()
        admin.magic_link_token = hash_token(token)
        await db.commit()

    tautan = buat_tautan(token)
    print(("Admin baru dibuat: " if baru else "Tautan admin diganti: ") + nama)
    print("Buka tautan ini di browser untuk masuk (simpan, tidak akan ditampilkan lagi):")
    print(tautan)
    await engine.dispose()
    return tautan


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit('Pemakaian: python -m app.scripts.buat_admin "Nama Admin"')
    asyncio.run(main(sys.argv[1]))
