"""Manajemen pengguna dan halaqah oleh admin."""
import logging
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core.quran_meta import JUMLAH_JUZ
from app.core.security import buat_tautan, buat_token_mentah, hash_token
from app.models.enums import UserRole
from app.models.halaqah import Halaqah
from app.models.santri_profile import SantriProfile
from app.models.user import User
from app.schemas.admin import (
    HalaqahAdminRead,
    HalaqahCreate,
    HalaqahUpdate,
    PenggunaCreate,
    PenggunaDibuat,
    PenggunaRead,
    PenggunaUpdate,
    TautanMasuk,
)
from app.services import analytics_service
from app.services.santri_query import _pola_ilike

logger = logging.getLogger(__name__)


def _tolak(kode: int, pesan: str) -> HTTPException:
    return HTTPException(kode, pesan)


# ---------- pembacaan ----------
def _stmt_pengguna():
    return (
        select(User, Halaqah.nama_kelas, SantriProfile.target_juz, SantriProfile.hafalan_awal_ayat)
        .outerjoin(Halaqah, User.halaqah_id == Halaqah.id)
        .outerjoin(SantriProfile, SantriProfile.user_id == User.id)
    )


def _ke_read(baris) -> PenggunaRead:
    user, nama_halaqah, target, awal = baris
    santri = user.role == UserRole.SANTRI
    return PenggunaRead(
        id=user.id,
        nama_lengkap=user.nama_lengkap,
        role=user.role,
        halaqah_id=user.halaqah_id,
        nama_halaqah=nama_halaqah,
        target_juz=(target if target is not None else JUMLAH_JUZ) if santri else None,
        hafalan_awal_ayat=(awal or 0) if santri else None,
        punya_tautan=user.magic_link_token is not None,
        created_at=user.created_at,
    )


async def baca_pengguna(db: AsyncSession, user_id: uuid.UUID) -> PenggunaRead:
    baris = (await db.execute(_stmt_pengguna().where(User.id == user_id))).first()
    if baris is None:
        raise _tolak(status.HTTP_404_NOT_FOUND, "Pengguna tidak ditemukan.")
    return _ke_read(baris)


async def daftar_pengguna(
    db: AsyncSession, role: UserRole | None, halaqah_id: uuid.UUID | None, q: str | None
) -> list[PenggunaRead]:
    stmt = _stmt_pengguna()
    if role is not None:
        stmt = stmt.where(User.role == role)
    if halaqah_id is not None:
        stmt = stmt.where(User.halaqah_id == halaqah_id)
    if q is not None and q.strip():
        stmt = stmt.where(User.nama_lengkap.ilike(_pola_ilike(q.strip()), escape="\\"))
    stmt = stmt.order_by(User.role, func.lower(User.nama_lengkap))
    return [_ke_read(b) for b in (await db.execute(stmt)).all()]


async def _ambil_pengguna(db: AsyncSession, user_id: uuid.UUID) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise _tolak(status.HTTP_404_NOT_FOUND, "Pengguna tidak ditemukan.")
    return user


async def _pastikan_halaqah_ada(db: AsyncSession, halaqah_id: uuid.UUID) -> None:
    if await db.get(Halaqah, halaqah_id) is None:
        raise _tolak(422, "Halaqah tidak ditemukan.")


async def _pastikan_ustadz(db: AsyncSession, ustadz_id: uuid.UUID) -> None:
    user = await db.get(User, ustadz_id)
    if user is None or user.role != UserRole.USTADZ:
        raise _tolak(422, "Ustadz tidak ditemukan.")


# ---------- tautan masuk ----------
def _terbitkan_tautan(user: User) -> TautanMasuk:
    token = buat_token_mentah()
    user.magic_link_token = hash_token(token)
    return TautanMasuk(token=token, magic_link=buat_tautan(token))


async def ganti_tautan(db: AsyncSession, admin: User, user_id: uuid.UUID) -> TautanMasuk:
    if user_id == admin.id:
        raise _tolak(
            status.HTTP_409_CONFLICT,
            "Tautan akun sendiri tidak dapat diganti dari sini agar Anda tidak terkunci. "
            "Gunakan skrip buat_admin atau akun admin lain.",
        )
    user = await _ambil_pengguna(db, user_id)
    tautan = _terbitkan_tautan(user)
    await db.commit()
    return tautan


async def cabut_tautan(db: AsyncSession, admin: User, user_id: uuid.UUID) -> None:
    if user_id == admin.id:
        raise _tolak(status.HTTP_409_CONFLICT, "Tautan akun sendiri tidak dapat dicabut dari sini.")
    user = await _ambil_pengguna(db, user_id)
    user.magic_link_token = None
    await db.commit()


# ---------- CRUD pengguna ----------
async def buat_pengguna(db: AsyncSession, payload: PenggunaCreate) -> PenggunaDibuat:
    if payload.halaqah_id is not None:
        if payload.role != UserRole.SANTRI:
            raise _tolak(422, "Halaqah hanya dapat diisi untuk santri.")
        await _pastikan_halaqah_ada(db, payload.halaqah_id)

    user = User(
        nama_lengkap=payload.nama_lengkap,
        role=payload.role,
        halaqah_id=payload.halaqah_id,
    )
    tautan = _terbitkan_tautan(user)
    db.add(user)
    await db.flush()
    if payload.role == UserRole.SANTRI:
        db.add(
            SantriProfile(
                user_id=user.id,
                target_juz=payload.target_juz,
                hafalan_awal_ayat=payload.hafalan_awal_ayat,
            )
        )
    await db.commit()
    return PenggunaDibuat(pengguna=await baca_pengguna(db, user.id), tautan=tautan)


async def ubah_pengguna(db: AsyncSession, user_id: uuid.UUID, payload: PenggunaUpdate) -> PenggunaRead:
    user = await _ambil_pengguna(db, user_id)
    dikirim = payload.model_fields_set
    santri = user.role == UserRole.SANTRI

    if "halaqah_id" in dikirim and payload.halaqah_id is not None:
        if not santri:
            raise _tolak(422, "Halaqah hanya dapat diisi untuk santri.")
        await _pastikan_halaqah_ada(db, payload.halaqah_id)
    for kolom in ("target_juz", "hafalan_awal_ayat"):
        if kolom in dikirim and getattr(payload, kolom) is not None and not santri:
            raise _tolak(
                422, "Target juz dan hafalan awal hanya untuk santri."
            )

    if payload.nama_lengkap is not None:
        user.nama_lengkap = payload.nama_lengkap
    if "halaqah_id" in dikirim:
        user.halaqah_id = payload.halaqah_id

    nilai_profil: dict[str, int] = {}
    if payload.target_juz is not None:
        nilai_profil["target_juz"] = payload.target_juz
    if payload.hafalan_awal_ayat is not None:
        nilai_profil["hafalan_awal_ayat"] = payload.hafalan_awal_ayat
    if nilai_profil:
        stmt = pg_insert(SantriProfile).values(user_id=user.id, **nilai_profil)
        await db.execute(
            stmt.on_conflict_do_update(
                index_elements=[SantriProfile.user_id],
                set_={**nilai_profil, "updated_at": func.now()},
            )
        )
    await db.commit()

    if nilai_profil:
        try:
            await analytics_service.hitung_dan_simpan(db, user.id)
        except Exception:
            await db.rollback()
            logger.exception("Gagal menghitung ulang analitik santri %s", user.id)
    return await baca_pengguna(db, user.id)


async def hapus_pengguna(db: AsyncSession, admin: User, user_id: uuid.UUID) -> None:
    user = await _ambil_pengguna(db, user_id)
    if user.id == admin.id:
        raise _tolak(status.HTTP_409_CONFLICT, "Anda tidak dapat menghapus akun sendiri.")
    if user.role == UserRole.ADMIN:
        jumlah_admin = (
            await db.execute(select(func.count()).select_from(User).where(User.role == UserRole.ADMIN))
        ).scalar_one()
        if jumlah_admin <= 1:
            raise _tolak(status.HTTP_409_CONFLICT, "Admin terakhir tidak dapat dihapus.")
    await db.delete(user)  # setoran, profil, dan lencana ikut terhapus lewat FK ON DELETE CASCADE
    await db.commit()


# ---------- halaqah ----------
def _stmt_halaqah():
    ustadz = aliased(User)
    jumlah = (
        select(func.count(User.id))
        .where(User.halaqah_id == Halaqah.id, User.role == UserRole.SANTRI)
        .correlate(Halaqah)
        .scalar_subquery()
    )
    return (
        select(
            Halaqah.id,
            Halaqah.nama_kelas,
            Halaqah.ustadz_id,
            ustadz.nama_lengkap.label("nama_ustadz"),
            jumlah.label("jumlah_santri"),
        )
        .outerjoin(ustadz, Halaqah.ustadz_id == ustadz.id)
        .order_by(Halaqah.nama_kelas)
    )


def _ke_halaqah_read(r) -> HalaqahAdminRead:
    return HalaqahAdminRead(
        id=r.id,
        nama_kelas=r.nama_kelas,
        ustadz_id=r.ustadz_id,
        nama_ustadz=r.nama_ustadz,
        jumlah_santri=r.jumlah_santri,
    )


async def daftar_halaqah_admin(db: AsyncSession) -> list[HalaqahAdminRead]:
    return [_ke_halaqah_read(r) for r in (await db.execute(_stmt_halaqah())).all()]


async def _baca_halaqah(db: AsyncSession, halaqah_id: uuid.UUID) -> HalaqahAdminRead:
    r = (await db.execute(_stmt_halaqah().where(Halaqah.id == halaqah_id))).first()
    if r is None:
        raise _tolak(status.HTTP_404_NOT_FOUND, "Halaqah tidak ditemukan.")
    return _ke_halaqah_read(r)


async def buat_halaqah(db: AsyncSession, payload: HalaqahCreate) -> HalaqahAdminRead:
    if payload.ustadz_id is not None:
        await _pastikan_ustadz(db, payload.ustadz_id)
    halaqah = Halaqah(nama_kelas=payload.nama_kelas, ustadz_id=payload.ustadz_id)
    db.add(halaqah)
    await db.commit()
    return await _baca_halaqah(db, halaqah.id)


async def ubah_halaqah(
    db: AsyncSession, halaqah_id: uuid.UUID, payload: HalaqahUpdate
) -> HalaqahAdminRead:
    halaqah = await db.get(Halaqah, halaqah_id)
    if halaqah is None:
        raise _tolak(status.HTTP_404_NOT_FOUND, "Halaqah tidak ditemukan.")
    if "ustadz_id" in payload.model_fields_set and payload.ustadz_id is not None:
        await _pastikan_ustadz(db, payload.ustadz_id)
    if payload.nama_kelas is not None:
        halaqah.nama_kelas = payload.nama_kelas
    if "ustadz_id" in payload.model_fields_set:
        halaqah.ustadz_id = payload.ustadz_id
    await db.commit()
    return await _baca_halaqah(db, halaqah_id)


async def hapus_halaqah(db: AsyncSession, halaqah_id: uuid.UUID) -> None:
    halaqah = await db.get(Halaqah, halaqah_id)
    if halaqah is None:
        raise _tolak(status.HTTP_404_NOT_FOUND, "Halaqah tidak ditemukan.")
    await db.delete(halaqah)  # santri di halaqah ini menjadi tanpa halaqah (FK ON DELETE SET NULL)
    await db.commit()


async def atur_target_kelas(db: AsyncSession, halaqah_id: uuid.UUID, target_juz: int) -> int:
    if await db.get(Halaqah, halaqah_id) is None:
        raise _tolak(status.HTTP_404_NOT_FOUND, "Halaqah tidak ditemukan.")
    ids = list(
        (
            await db.execute(
                select(User.id).where(User.halaqah_id == halaqah_id, User.role == UserRole.SANTRI)
            )
        )
        .scalars()
        .all()
    )
    if not ids:
        return 0
    stmt = pg_insert(SantriProfile).values(
        [
            {
                "user_id": i,
                "target_juz": target_juz,
                "hafalan_awal_ayat": 0,
                "current_streak": 0,
                "highest_streak": 0,
            }
            for i in ids
        ]
    )
    await db.execute(
        stmt.on_conflict_do_update(
            index_elements=[SantriProfile.user_id],
            set_={"target_juz": target_juz, "updated_at": func.now()},
        )
    )
    await db.commit()
    return len(ids)
