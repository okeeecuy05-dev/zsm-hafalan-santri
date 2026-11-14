"""Data demo streak: mengisi riwayat ZSM lengkap beberapa hari ke belakang.

Jalankan SETELAH seed utama:  python -m app.scripts.seed_streak_demo [jumlah_hari] [nama_santri]
Hari ini sengaja TIDAK diisi, sehingga kartu streak menampilkan status "terancam".
"""
import asyncio
import sys
from datetime import timedelta

from sqlalchemy import select

from app import models  # noqa: F401
from app.core.waktu import hari_ini
from app.db.session import AsyncSessionLocal, engine
from app.models import SetoranLog, TipeSesi, User, UserRole
from app.services import streak_service


async def main(jumlah_hari: int, nama: str | None) -> None:
    async with AsyncSessionLocal() as db:
        stmt = select(User).where(User.role == UserRole.SANTRI).order_by(User.nama_lengkap)
        if nama:
            stmt = stmt.where(User.nama_lengkap.ilike(f"%{nama}%"))
        santri = (await db.execute(stmt.limit(1))).scalar_one_or_none()
        if santri is None:
            print("Santri tidak ditemukan. Jalankan 'python -m app.scripts.seed' terlebih dahulu.")
            await engine.dispose()
            return

        sudah_ada = (
            await db.execute(select(SetoranLog.id).where(SetoranLog.santri_id == santri.id).limit(1))
        ).scalar_one_or_none()
        if sudah_ada:
            print(f"Dilewati: {santri.nama_lengkap} sudah memiliki riwayat setoran.")
            await engine.dispose()
            return

        hari = hari_ini()
        for mundur in range(1, jumlah_hari + 1):
            tgl = hari - timedelta(days=mundur)
            for sesi in (TipeSesi.ZIADAH, TipeSesi.SABQI, TipeSesi.MURAJAAH):
                db.add(
                    SetoranLog(
                        santri_id=santri.id,
                        tipe_sesi=sesi,
                        tanggal=tgl,
                        surah_awal=2,
                        ayat_awal=1,
                        surah_akhir=2,
                        ayat_akhir=5,
                    )
                )
        await db.commit()

        hasil = await streak_service.hitung_dan_simpan(db, santri.id)
        print(f"{santri.nama_lengkap}: current streak {hasil.current_streak}, tertinggi {hasil.highest_streak}")
        print(f"santri_id = {santri.id}")

    await engine.dispose()


if __name__ == "__main__":
    hari_arg = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    nama_arg = sys.argv[2] if len(sys.argv) > 2 else None
    asyncio.run(main(hari_arg, nama_arg))
