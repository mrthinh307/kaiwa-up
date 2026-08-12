import logging

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core import settings
from app.core.database import engine
from app.schemas import ReadinessResponse
from app.utils.datetime_utils import utc_now

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ready", tags=["Health"])


async def check_database_connection() -> None:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))


@router.get(
    "",
    operation_id="readinessCheck",
    response_model=ReadinessResponse,
    summary="Check application and database readiness",
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"description": "Database is not ready"}},
)
async def readiness_check() -> ReadinessResponse:
    try:
        await check_database_connection()
    except SQLAlchemyError as exc:
        logger.warning("Database readiness check failed", exc_info=exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not ready",
        ) from exc

    return ReadinessResponse(
        status="ready",
        timestamp=utc_now(),
        app_name=settings.app_name,
        database="ok",
    )
