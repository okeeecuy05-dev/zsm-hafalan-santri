import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String, false
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Badge(Base):
    """Lencana milestone. kriteria_pencapaian berformat "juz:N" (mis. "juz:5")."""

    __tablename__ = "badges"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nama_badge: Mapped[str] = mapped_column(String(100))
    kriteria_pencapaian: Mapped[str] = mapped_column(String(50), unique=True)


class SantriBadge(Base):
    __tablename__ = "santri_badges"

    santri_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    badge_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("badges.id", ondelete="CASCADE"), primary_key=True
    )
    tanggal_didapat: Mapped[date] = mapped_column(Date)
    # False sampai santri menutup pop-up selebrasi lencana baru.
    dilihat: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
