import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    SmallInteger,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SantriProfile(Base):
    """Ringkasan capaian santri. Fase 2 mengisi kolom streak; kolom prediksi diisi Fase 4."""

    __tablename__ = "santri_profiles"
    __table_args__ = (
        CheckConstraint("target_juz BETWEEN 1 AND 30", name="target_juz_valid"),
        CheckConstraint("current_streak >= 0", name="current_streak_valid"),
        CheckConstraint("highest_streak >= 0", name="highest_streak_valid"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    target_juz: Mapped[int] = mapped_column(SmallInteger, default=30, server_default="30")
    # Jumlah ayat yang sudah dihafal SEBELUM memakai aplikasi (diisi admin).
    hafalan_awal_ayat: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    current_streak: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    highest_streak: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    last_complete_date: Mapped[date | None] = mapped_column(Date)
    avg_ayat_per_day: Mapped[float | None] = mapped_column(Float)
    estimasi_khatam_date: Mapped[date | None] = mapped_column(Date)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
