"""Data demo analitik: riwayat Ziadah terverifikasi 40 hari ke belakang.

Jalankan SETELAH seed utama:  python -m app.scripts.seed_analytics_demo
  - santri #1 (urut nama): stabil 8 ayat/hari selama 35 hari  -> terprediksi, lencana "Hafal 1 Juz"
  - santri #2           : 10 ayat/hari lalu melambat (1 ayat/hari) di 7 hari terakhir -> PERINGATAN MELAMBAT
Skrip dilewati jika santri tersebut sudah punya Ziadah terverifikasi sebelum hari ini.
"""
import asyncio
from datetime import timedelta

from sqlalchemy import select

from app import models  # noqa: F401
from app.core.quran_meta import dari_indeks, ke_indeks
from app.core.waktu import hari_ini
from app.db.session import AsyncSessionLocal, engine
from app.models import SetoranLog, StatusSetoran, TipeSesi, User, UserRole
from app.services import analytics_service


def _buat_log(santri_id, tanggal, awal_idx: int, jumlah: int) -> SetoranLog:
    s1, a1 = dari_indeks(awal_idx)
    s2, a2 = dari_indeks(awal_idx + jumlah - 1)
    return SetoranLog(
        santri_id=santri_id,
        tipe_sesi=TipeSesi.ZIADAH,
        tanggal=tanggal,
        surah_awal=s1,
        ayat_awal=a1,
        surah_akhir=s2,
        ayat_akhir=a2,
        status=StatusSetoran.VERIFIED,
        rating=4,
        catatan_ustadz="Lancar.",
    )


async def main() -> None:
    async with AsyncSessionLocal() as db:
        santri = list(
            (
                await db.execute(
                    select(User).where(User.role == UserRole.SANTRI).order_by(User.nama_lengkap)
                )
            ).scalars()
        )
        if len(santri) < 2:
            print("Butuh minimal 2 santri. Jalankan 'python -m app.scripts.seed' terlebih dahulu.")
            await engine.dispose()
            return

        hari = hari_ini()
        sudah = (
            await db.execute(
                select(SetoranLog.id)
                .where(
                    SetoranLog.santri_id.in_([santri[0].id, santri[1].id]),
                    SetoranLog.tipe_sesi == TipeSesi.ZIADAH,
                    SetoranLog.status == StatusSetoran.VERIFIED,
                    SetoranLog.tanggal < hari,
                )
                .limit(1)
            )
        ).scalar_one_or_none()
        if sudah:
            print("Dilewati: sudah ada riwayat Ziadah terverifikasi.")
            await engine.dispose()
            return

        awal = ke_indeks(78, 1)  # mulai dari Juz 30 (An-Naba')

        # santri #1: 8 ayat/hari selama 35 hari terakhir (kemarin mundur)
        penunjuk = awal
        for mundur in range(35, 0, -1):
            db.add(_buat_log(santri[0].id, hari - timedelta(days=mundur), penunjuk, 8))
            penunjuk += 8

        # santri #2: 10 ayat/hari pada hari ke-40..8 lalu, kemudian 1 ayat/hari pada 7 hari terakhir
        penunjuk = awal
        for mundur in range(40, 7, -1):
            db.add(_buat_log(santri[1].id, hari - timedelta(days=mundur), penunjuk, 10))
            penunjuk += 10
        for mundur in range(7, 0, -1):
            db.add(_buat_log(santri[1].id, hari - timedelta(days=mundur), penunjuk, 1))
            penunjuk += 1
        await db.commit()

        for s in santri[:2]:
            hasil, _ = await analytics_service.hitung_dan_simpan(db, s.id)
            print(
                f"{s.nama_lengkap}: total {hasil.total_hafal_ayat} ayat, "
                f"{hasil.avg_ayat_per_hari} ayat/hari, estimasi {hasil.estimasi_khatam}, "
                f"melambat={hasil.melambat}"
            )
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
