from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    health,
    readiness,
    users,
)

router = APIRouter()


router.include_router(
    health.router,
    prefix="/health",
    tags=["Health"],
)

router.include_router(
    readiness.router,
    prefix="/readiness",
    tags=["Readiness"],
)

router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Auth"],
)

router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"],
)
