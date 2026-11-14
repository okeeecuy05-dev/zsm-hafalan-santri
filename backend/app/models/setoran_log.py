import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import StatusSetoran, TipeSesi, pg_enum


class SetoranLog(Base):
    __tablename__ = "setoran_logs"
    __table_args__ = (
        CheckConstraint("surah_awal BETWEEN 1 AND 114", name="surah_awal_valid"),
        CheckConstraint("surah_akhir BETWEEN 1 AND 114", name="surah_akhir_valid"),
        CheckConstraint("ayat_awal >= 1", name="ayat_awal_valid"),
        CheckConstraint("ayat_akhir >= 1", name="ayat_akhir_valid"),
        CheckConstraint("rating IS NULL OR rating BETWEEN 1 AND 5", name="rating_valid"),
        Index("ix_setoran_logs_santri_tanggal", "santri_id", "tanggal"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    santri_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    tipe_sesi: Mapped[TipeSesi] = mapped_column(pg_enum(TipeSesi, "tipe_sesi"))
    tanggal: Mapped[date] = mapped_column(Date)
    surah_awal: Mapped[int] = mapped_column(SmallInteger)
    ayat_awal: Mapped[int] = mapped_column(SmallInteger)
    surah_akhir: Mapped[int] = mapped_column(SmallInteger)
    ayat_akhir: Mapped[int] = mapped_column(SmallInteger)
    status: Mapped[StatusSetoran] = mapped_column(
        pg_enum(StatusSetoran, "status_setoran"), default=StatusSetoran.PENDING
    )
    rating: Mapped[int | None] = mapped_column(SmallInteger)
    catatan_ustadz: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
