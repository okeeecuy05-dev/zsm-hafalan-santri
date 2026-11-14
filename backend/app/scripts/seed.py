"""Data awal untuk pengembangan. Jalankan: python -m app.scripts.seed

Membuat 1 admin, 1 ustadz, 1 halaqah, 5 santri, dan MENCETAK tautan masuk (Magic Link) masing-masing.
Tautan hanya ditampilkan sekali (database hanya menyimpan hash-nya). Jika terlewat, buat ulang lewat
panel admin atau skrip buat_admin.
"""
import asyncio

from sqlalchemy import select

from app import models  # noqa: F401
from app.core.security import buat_tautan, buat_token_mentah, hash_token
from app.db.base import Base
from app.db.migrations import jalankan_migrasi
from app.db.session import AsyncSessionLocal, engine
from app.models import Halaqah, SantriProfile, User, UserRole
from app.services.badge_service import pastikan_badge_dasar

NAMA_SANTRI = [
    "Ahmad Fauzi",
    "Muhammad Rizky",
    "Abdullah Hakim",
    "Yusuf Ramadhan",
    "Zaid Alfarisi",
]


def _beri_token(user: User, daftar: list[tuple[str, str, str]]) -> None:
    token = buat_token_mentah()
    user.magic_link_token = hash_token(token)
    daftar.append((user.role.value, user.nama_lengkap, buat_tautan(token)))


async def main() -> list[tuple[str, str, str]]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await jalankan_migrasi(conn)

    tautan: list[tuple[str, str, str]] = []
    async with AsyncSessionLocal() as db:
        await pastikan_badge_dasar(db)
        sudah_ada = (await db.execute(select(User).limit(1))).scalar_one_or_none()
        if sudah_ada:
            print("Seed dilewati: data pengguna sudah ada.")
            print("Untuk membuat admin/tautan baru: python -m app.scripts.buat_admin \"Nama Admin\"")
            await engine.dispose()
            return tautan

        admin = User(nama_lengkap="Admin ZSM", role=UserRole.ADMIN)
        ustadz = User(nama_lengkap="Ustadz Abdurrahman", role=UserRole.USTADZ)
        db.add_all([admin, ustadz])
        await db.flush()

        halaqah = Halaqah(nama_kelas="Halaqah Al-Fatih", ustadz_id=ustadz.id)
        db.add(halaqah)
        await db.flush()

        santri = [
            User(nama_lengkap=nama, role=UserRole.SANTRI, halaqah_id=halaqah.id)
            for nama in NAMA_SANTRI
        ]
        db.add_all(santri)
        await db.flush()
        db.add_all([SantriProfile(user_id=s.id, target_juz=30, hafalan_awal_ayat=0) for s in santri])

        for user in (admin, ustadz, *santri):
            _beri_token(user, tautan)
        await db.commit()

    print(f"Halaqah: Halaqah Al-Fatih | Ustadz: Ustadz Abdurrahman | {len(NAMA_SANTRI)} santri\n")
    print("=== TAUTAN MASUK (simpan sekarang; tidak akan ditampilkan lagi) ===")
    for role, nama, link in tautan:
        print(f"[{role:6}] {nama}\n         {link}")
    await engine.dispose()
    return tautan


if __name__ == "__main__":
    asyncio.run(main())
