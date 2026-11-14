"""Data demo Dasbor Ustadz: mengisi setoran HARI INI dengan tingkat kelengkapan berbeda.

Jalankan SETELAH seed utama:  python -m app.scripts.seed_dashboard_demo
Hasil (urut nama santri hasil seed):
  1. lengkap 3 sesi, Ziadah sudah terverifikasi, 2 sesi lain menunggu  -> hijau
  2. Ziadah + Sabqi menunggu validasi                                  -> kuning
  3. Ziadah terverifikasi                                              -> kuning
  4-5. belum setor                                                     -> merah
Skrip dilewati jika sudah ada setoran hari ini untuk santri-santri tersebut.
"""
import asyncio

from sqlalchemy import select

from app import models  # noqa: F401
from app.core.waktu import hari_ini
from app.db.session import AsyncSessionLocal, engine
from app.models import SetoranLog, StatusSetoran, TipeSesi, User, UserRole

Z, S, M = TipeSesi.ZIADAH, TipeSesi.SABQI, TipeSesi.MURAJAAH
V, P = StatusSetoran.VERIFIED, StatusSetoran.PENDING

# (indeks santri, sesi, status, surah, ayat_awal, ayat_akhir, rating, catatan)
RENCANA = [
    (0, Z, V, 2, 1, 10, 5, "Mutqin, tajwid terjaga."),
    (0, S, P, 2, 1, 10, None, None),
    (0, M, P, 1, 1, 7, None, None),
    (1, Z, P, 2, 11, 20, None, None),
    (1, S, P, 2, 11, 20, None, None),
    (2, Z, V, 2, 21, 30, 3, "Perbaiki mad pada ayat 25."),
]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        santri = list(
            (
                await db.execute(
                    select(User).where(User.role == UserRole.SANTRI).order_by(User.nama_lengkap)
                )
            ).scalars()
        )
        if len(santri) < 3:
            print("Butuh minimal 3 santri. Jalankan 'python -m app.scripts.seed' terlebih dahulu.")
            await engine.dispose()
            return

        hari = hari_ini()
        sudah_ada = (
            await db.execute(
                select(SetoranLog.id)
                .where(SetoranLog.tanggal == hari, SetoranLog.santri_id.in_([s.id for s in santri]))
                .limit(1)
            )
        ).scalar_one_or_none()
        if sudah_ada:
            print("Dilewati: sudah ada setoran hari ini.")
            await engine.dispose()
            return

        for idx, sesi, status, surah, awal, akhir, rating, catatan in RENCANA:
            db.add(
                SetoranLog(
                    santri_id=santri[idx].id,
                    tipe_sesi=sesi,
                    tanggal=hari,
                    surah_awal=surah,
                    ayat_awal=awal,
                    surah_akhir=surah,
                    ayat_akhir=akhir,
                    status=status,
                    rating=rating,
                    catatan_ustadz=catatan,
                )
            )
        await db.commit()
        print(f"Data demo dasbor untuk {hari} dibuat ({len(RENCANA)} setoran).")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
