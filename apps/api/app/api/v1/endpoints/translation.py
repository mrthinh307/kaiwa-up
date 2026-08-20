"""Listening & Translation API endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Path, Query, status

from app.api.dependencies.ai import AiGatewayDep
from app.api.dependencies.auth import CurrentUser
from app.api.dependencies.database import DatabaseSession
from app.api.dependencies.pagination import Pagination
from app.models.enums import JlptLevel
from app.repositories.translation import TranslationRepository
from app.schemas.error import ErrorResponse
from app.schemas.pagination import PaginatedResponse
from app.schemas.translation import (
    TranslationLessonDetail,
    TranslationLessonItem,
    TranslationSubmissionCreate,
    TranslationSubmissionResponse,
)
from app.services.translation import TranslationService

router = APIRouter(prefix="/listening-translation", tags=["Listening Translation"])


def _translation_service(session: DatabaseSession, ai_gateway: AiGatewayDep) -> TranslationService:
    return TranslationService(TranslationRepository(session), ai_gateway)


@router.get(
    "/lessons",
    operation_id="listListeningTranslationLessons",
    response_model=PaginatedResponse[TranslationLessonItem],
)
async def list_translation_lessons(
    current_user: CurrentUser,
    session: DatabaseSession,
    ai_gateway: AiGatewayDep,
    pagination: Pagination,
    difficulty: Annotated[JlptLevel | None, Query()] = None,
) -> PaginatedResponse[TranslationLessonItem]:
    return await _translation_service(session, ai_gateway).list_lessons(
        user_id=current_user.id,
        difficulty=difficulty,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get(
    "/lessons/{lesson_id}",
    operation_id="getListeningTranslationLesson",
    response_model=TranslationLessonDetail,
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
)
async def get_translation_lesson(
    lesson_id: Annotated[uuid.UUID, Path()],
    current_user: CurrentUser,
    session: DatabaseSession,
    ai_gateway: AiGatewayDep,
) -> TranslationLessonDetail:
    return await _translation_service(session, ai_gateway).get_lesson(
        user_id=current_user.id,
        content_id=lesson_id,
    )


@router.post(
    "/lessons/{lesson_id}/submit",
    operation_id="submitListeningTranslation",
    response_model=TranslationSubmissionResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_409_CONFLICT: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
        status.HTTP_429_TOO_MANY_REQUESTS: {"model": ErrorResponse},
        status.HTTP_502_BAD_GATEWAY: {"model": ErrorResponse},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse},
        status.HTTP_504_GATEWAY_TIMEOUT: {"model": ErrorResponse},
    },
)
async def submit_translation(
    lesson_id: Annotated[uuid.UUID, Path()],
    request: TranslationSubmissionCreate,
    current_user: CurrentUser,
    session: DatabaseSession,
    ai_gateway: AiGatewayDep,
) -> TranslationSubmissionResponse:
    return await _translation_service(session, ai_gateway).submit_translation(
        user_id=current_user.id,
        content_id=lesson_id,
        translation_vi=request.translation_vi,
    )
