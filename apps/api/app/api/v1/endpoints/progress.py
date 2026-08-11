import uuid
from typing import Annotated

from fastapi import APIRouter, Path, Query, status

from app.api.dependencies.current_user import CurrentUser
from app.api.dependencies.database import DatabaseSession
from app.api.dependencies.pagination import Pagination
from app.models.enums import ContentType
from app.repositories.progress import ProgressRepository
from app.schemas.pagination import PaginatedResponse
from app.schemas.progress import (
    ProgressAttemptDetail,
    ProgressAttemptItem,
    ProgressSummaryResponse,
)
from app.services.progress import ProgressService

router = APIRouter(prefix="/progress", tags=["Progress"])


def _progress_service(session: DatabaseSession) -> ProgressService:
    return ProgressService(ProgressRepository(session))


@router.get(
    "/summary",
    response_model=ProgressSummaryResponse,
    summary="Get progress summary for the current user",
)
async def get_progress_summary(
    current_user: CurrentUser,
    session: DatabaseSession,
) -> ProgressSummaryResponse:
    return await _progress_service(session).get_summary(current_user.id)


@router.get(
    "/attempts",
    response_model=PaginatedResponse[ProgressAttemptItem],
    summary="List attempt history for the current user",
)
async def list_progress_attempts(
    current_user: CurrentUser,
    pagination: Pagination,
    session: DatabaseSession,
    content_type: Annotated[ContentType | None, Query()] = None,
    content_id: Annotated[uuid.UUID | None, Query()] = None,
) -> PaginatedResponse[ProgressAttemptItem]:
    return await _progress_service(session).list_attempts(
        current_user.id,
        content_type=content_type,
        content_id=content_id,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get(
    "/attempts/{attempt_id}",
    response_model=ProgressAttemptDetail,
    summary="Get a single attempt detail for the current user",
    responses={
        status.HTTP_403_FORBIDDEN: {"description": "Attempt belongs to another user"},
        status.HTTP_404_NOT_FOUND: {"description": "Attempt not found"},
    },
)
async def get_progress_attempt(
    attempt_id: Annotated[uuid.UUID, Path()],
    current_user: CurrentUser,
    session: DatabaseSession,
) -> ProgressAttemptDetail:
    return await _progress_service(session).get_attempt_detail(current_user.id, attempt_id)
