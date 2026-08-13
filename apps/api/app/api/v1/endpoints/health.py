from fastapi import APIRouter

from app.core import settings
from app.schemas import HealthResponse
from app.utils.datetime_utils import utc_now

router = APIRouter(prefix="/health", tags=["Health"])


@router.get(
    "",
    operation_id="healthCheck",
    response_model=HealthResponse,
    summary="Check application health",
)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", timestamp=utc_now(), app_name=settings.app_name)
