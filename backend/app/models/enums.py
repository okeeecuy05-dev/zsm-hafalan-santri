import enum

from sqlalchemy import Enum as SAEnum


class UserRole(str, enum.Enum):
    SANTRI = "santri"
    USTADZ = "ustadz"
    ADMIN = "admin"


class TipeSesi(str, enum.Enum):
    ZIADAH = "ziadah"
    SABQI = "sabqi"
    MURAJAAH = "murajaah"


class StatusSetoran(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"


def pg_enum(enum_cls: type[enum.Enum], name: str) -> SAEnum:
    """Enum PostgreSQL yang menyimpan nilai (bukan nama) anggota enum."""
    return SAEnum(enum_cls, name=name, values_callable=lambda e: [m.value for m in e])
