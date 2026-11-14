from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.core.config import settings


def hari_ini() -> date:
    """Tanggal hari ini menurut zona waktu aplikasi (settings.timezone)."""
    return datetime.now(ZoneInfo(settings.timezone)).date()
