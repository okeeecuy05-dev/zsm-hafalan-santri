import logging
import uuid
from collections.abc import Sequence
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.quran_meta import dari_indeks, ke_indeks, validasi_rentang
from app.core.waktu import hari_ini
from app.models.enums import StatusSetoran, TipeSesi, UserRole
from app.models.setoran_log import SetoranLog
from app.models.user import User
from app.schemas.setoran import (
    AutoFillResponse,
    SegmenAyat,
    SetoranCreate,
    SetoranUpdate,
    SetoranValidasi,
)
from app.services import analytics_service, streak_service

logger = logging.getLogger(__name__)


async def _sinkron_streak(db: AsyncSession, santri_id: uuid.UUID) -> None:
    """Perbarui santri_profiles setelah setoran berubah.

    Setoran sudah ter-commit; kegagalan sinkron tidak boleh menggagalkan permintaan.
    GET /api/streak/{santri_id} tetap menghitung ulang dari riwayat, jadi data akan pulih.
    """
    try:
        await streak_service.hitung_dan_simpan(db, santri_id)
    except Exception:
        await db.rollback()
        logger.exception("Gagal menyinkronkan streak santri %s", santri_id)


async def get_santri_or_404(db: AsyncSession, santri_id: uuid.UUID) -> User:
    result = await db.execute(select(User).where(User.id == santri_id, User.role == UserRole.SANTRI))
    santri = result.scalar_one_or_none()
    if santri is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Santri tidak ditemukan.")
    return santri


async def get_setoran_or_404(db: AsyncSession, setoran_id: uuid.UUID) -> SetoranLog:
    log = await db.get(SetoranLog, setoran_id)
    if log is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Setoran tidak ditemukan.")
    return log


def _pastikan_bisa_diubah(log: SetoranLog) -> None:
    if log.status == StatusSetoran.VERIFIED:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Setoran sudah terverifikasi dan tidak dapat diubah."
        )


def _pastikan_bukan_masa_depan(tanggal: date) -> None:
    if tanggal > hari_ini():
        raise HTTPException(422, "Tanggal setoran tidak boleh di masa depan.")


async def _sinkron_analitik(db: AsyncSession, santri_id: uuid.UUID) -> None:
    """Perbarui rata-rata, estimasi khatam, dan lencana setelah Ziadah divalidasi (best effort)."""
    try:
        await analytics_service.hitung_dan_simpan(db, santri_id)
    except Exception:
        await db.rollback()
        logger.exception("Gagal menyinkronkan analitik santri %s", santri_id)


async def create_setoran(db: AsyncSession, payload: SetoranCreate) -> SetoranLog:
    await get_santri_or_404(db, payload.santri_id)
    tanggal = payload.tanggal or hari_ini()
    _pastikan_bukan_masa_depan(tanggal)
    log = SetoranLog(
        santri_id=payload.santri_id,
        tipe_sesi=payload.tipe_sesi,
        tanggal=tanggal,
        surah_awal=payload.surah_awal,
        ayat_awal=payload.ayat_awal,
        surah_akhir=payload.surah_akhir,
        ayat_akhir=payload.ayat_akhir,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    await _sinkron_streak(db, log.santri_id)
    return log


async def list_setoran(
    db: AsyncSession,
    santri_id: uuid.UUID | None,
    santri_ids: Sequence[uuid.UUID] | None,
    tanggal: date | None,
    tipe_sesi: TipeSesi | None,
    limit: int,
    offset: int,
) -> list[SetoranLog]:
    stmt = select(SetoranLog).order_by(SetoranLog.tanggal.desc(), SetoranLog.created_at.desc())
    if santri_id is not None:
        stmt = stmt.where(SetoranLog.santri_id == santri_id)
    if santri_ids is not None:
        stmt = stmt.where(SetoranLog.santri_id.in_(list(santri_ids)))
    if tanggal is not None:
        stmt = stmt.where(SetoranLog.tanggal == tanggal)
    if tipe_sesi is not None:
        stmt = stmt.where(SetoranLog.tipe_sesi == tipe_sesi)
    result = await db.execute(stmt.limit(limit).offset(offset))
    return list(result.scalars().all())


async def update_setoran(db: AsyncSession, setoran_id: uuid.UUID, payload: SetoranUpdate) -> SetoranLog:
    log = await get_setoran_or_404(db, setoran_id)
    _pastikan_bisa_diubah(log)

    perubahan = payload.model_dump(exclude_unset=True, exclude_none=True)
    for key, value in perubahan.items():
        setattr(log, key, value)

    try:
        validasi_rentang(log.surah_awal, log.ayat_awal, log.surah_akhir, log.ayat_akhir)
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(422, str(exc)) from exc
    _pastikan_bukan_masa_depan(log.tanggal)

    await db.commit()
    await db.refresh(log)
    await _sinkron_streak(db, log.santri_id)
    return log


async def validasi_setoran(
    db: AsyncSession, setoran_id: uuid.UUID, payload: SetoranValidasi
) -> SetoranLog:
    """Ustadz memberi nilai + catatan dan mengesahkan setoran.

    Boleh dipanggil ulang pada setoran yang sudah terverifikasi (koreksi nilai/catatan).
    Streak tidak berubah karena pending dan verified sama-sama dihitung.
    """
    log = await get_setoran_or_404(db, setoran_id)
    log.rating = payload.rating
    log.catatan_ustadz = payload.catatan_ustadz
    log.status = StatusSetoran.VERIFIED
    await db.commit()
    await db.refresh(log)
    await _sinkron_analitik(db, log.santri_id)
    return log


async def delete_setoran(db: AsyncSession, setoran_id: uuid.UUID) -> None:
    log = await get_setoran_or_404(db, setoran_id)
    _pastikan_bisa_diubah(log)
    santri_id = log.santri_id
    await db.delete(log)
    await db.commit()
    await _sinkron_streak(db, santri_id)


async def build_auto_fill(db: AsyncSession, santri_id: uuid.UUID, tanggal: date | None) -> AutoFillResponse:
    """Rekomendasi Sabqi = gabungan rentang Ziadah santri pada tanggal tsb.

    Rentang yang saling bersambung/tumpang tindih digabung; rentang yang terpisah
    dikembalikan sebagai segmen terpisah supaya ayat yang belum dihafal tidak ikut terisi.
    """
    await get_santri_or_404(db, santri_id)
    tanggal = tanggal or hari_ini()

    result = await db.execute(
        select(
            SetoranLog.surah_awal,
            SetoranLog.ayat_awal,
            SetoranLog.surah_akhir,
            SetoranLog.ayat_akhir,
        ).where(
            SetoranLog.santri_id == santri_id,
            SetoranLog.tanggal == tanggal,
            SetoranLog.tipe_sesi == TipeSesi.ZIADAH,
        )
    )
    interval = sorted(
        (ke_indeks(r.surah_awal, r.ayat_awal), ke_indeks(r.surah_akhir, r.ayat_akhir))
        for r in result.all()
    )

    gabungan: list[list[int]] = []
    for awal, akhir in interval:
        if gabungan and awal <= gabungan[-1][1] + 1:
            gabungan[-1][1] = max(gabungan[-1][1], akhir)
        else:
            gabungan.append([awal, akhir])

    segmen: list[SegmenAyat] = []
    for awal, akhir in gabungan:
        surah_awal, ayat_awal = dari_indeks(awal)
        surah_akhir, ayat_akhir = dari_indeks(akhir)
        segmen.append(
            SegmenAyat(
                surah_awal=surah_awal,
                ayat_awal=ayat_awal,
                surah_akhir=surah_akhir,
                ayat_akhir=ayat_akhir,
            )
        )
    return AutoFillResponse(tersedia=bool(segmen), tanggal=tanggal, segmen=segmen)
