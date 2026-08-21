from fastapi import APIRouter

from app.api.dependencies.ai import AiGatewayDep
from app.api.dependencies.auth import CurrentUser
from app.api.dependencies.database import DatabaseSession
from app.repositories.reflex import ReflexRepository
from app.schemas.reflex import DueReviewListResponse, ReviewScheduleListResponse
from app.services.reflex import ReflexService

router = APIRouter(prefix="/review", tags=["Review"])


@router.get("/due", operation_id="listDueReviews", response_model=DueReviewListResponse)
async def list_due_reviews(
    current_user: CurrentUser, session: DatabaseSession, ai_gateway: AiGatewayDep
) -> DueReviewListResponse:
    result = await ReflexService(ReflexRepository(session), ai_gateway).list_schedules(
        user_id=current_user.id, is_due_only=True
    )
    if not isinstance(result, DueReviewListResponse):
        raise TypeError("Expected due review response")
    return result


@router.get(
    "/schedule", operation_id="listReviewSchedule", response_model=ReviewScheduleListResponse
)
async def list_review_schedule(
    current_user: CurrentUser, session: DatabaseSession, ai_gateway: AiGatewayDep
) -> ReviewScheduleListResponse:
    result = await ReflexService(ReflexRepository(session), ai_gateway).list_schedules(
        user_id=current_user.id, is_due_only=False
    )
    if not isinstance(result, ReviewScheduleListResponse):
        raise TypeError("Expected schedule response")
    return result
