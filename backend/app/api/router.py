from fastapi import APIRouter

from app.api.routes import (
    admin,
    analytics,
    auth,
    dashboard,
    halaqah,
    santri,
    setoran,
    streak,
    ustadz,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(santri.router)
api_router.include_router(ustadz.router)
api_router.include_router(halaqah.router)
api_router.include_router(setoran.router)
api_router.include_router(streak.router)
api_router.include_router(dashboard.router)
api_router.include_router(analytics.router)
api_router.include_router(admin.router)
