import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Halaqah(Base):
    __tablename__ = "halaqah"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nama_kelas: Mapped[str] = mapped_column(String(100))
    # use_alter: users.halaqah_id <-> halaqah.ustadz_id saling merujuk (siklus FK).
    ustadz_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL", use_alter=True, name="fk_halaqah_ustadz_id"),
        index=True,
    )
