"""Migrasi ringan yang idempoten (aman dijalankan berulang) untuk database dari fase sebelumnya.

`create_all` hanya membuat tabel yang belum ada; kolom baru pada tabel lama ditambahkan di sini.
Untuk produksi sebaiknya beralih ke Alembic.
"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

PERUBAHAN: tuple[str, ...] = (
    # Fase 4: hafalan sebelum memakai aplikasi
    "ALTER TABLE santri_profiles ADD COLUMN IF NOT EXISTS hafalan_awal_ayat INTEGER NOT NULL DEFAULT 0",
)


async def jalankan_migrasi(conn: AsyncConnection) -> None:
    for sql in PERUBAHAN:
        await conn.execute(text(sql))
