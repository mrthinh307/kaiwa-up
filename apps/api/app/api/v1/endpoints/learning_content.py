import uuid
from typing import Annotated

from fastapi import APIRouter, Path, Query, status

from app.api.dependencies.auth import CurrentUser
from app.api.dependencies.database import DatabaseSession
from app.api.dependencies.pagination import Pagination
from app.exceptions import ForbiddenError
from app.integrations.youtube import YouTubeCaptionProvider
from app.models.enums import ContentType, JlptLevel, UserRole
from app.repositories.learning_content import LearningContentRepository
from app.schemas.learning_content import (
    DictationContentDetail,
    LearningContentCreate,
    LearningContentCreateResponse,
    LearningContentDetail,
    LearningContentItem,
    ShadowingContentDetail,
)
from app.schemas.pagination import PaginatedResponse
from app.services.learning_content import LearningContentService

router = APIRouter(tags=["Learning Content"])


def _learning_content_service(session: DatabaseSession) -> LearningContentService:
    return LearningContentService(LearningContentRepository(session))


@router.post(
    "/lessons",
    operation_id="createLearningContentFromYouTube",
    response_model=LearningContentCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create draft learning content from Japanese YouTube captions",
    responses={
        status.HTTP_403_FORBIDDEN: {"description": "Admin access required"},
        status.HTTP_409_CONFLICT: {"description": "Learning content already exists"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {
            "description": "Invalid URL or Japanese transcript unavailable"
        },
        status.HTTP_502_BAD_GATEWAY: {"description": "YouTube transcript provider failed"},
    },
)
async def create_learning_content(
    request: LearningContentCreate,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> LearningContentCreateResponse:
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenError("Admin access is required")
    service = LearningContentService(
        LearningContentRepository(session),
        YouTubeCaptionProvider(),
    )
    return await service.create_from_youtube(request)


@router.post(
    "/lessons/{content_id}/publish",
    operation_id="publishLearningContent",
    response_model=LearningContentCreateResponse,
    summary="Publish draft learning content",
    responses={
        status.HTTP_403_FORBIDDEN: {"description": "Admin access required"},
        status.HTTP_404_NOT_FOUND: {"description": "Learning content not found"},
        status.HTTP_409_CONFLICT: {"description": "Learning content already published"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"description": "Learning content is incomplete"},
    },
)
async def publish_learning_content(
    content_id: Annotated[uuid.UUID, Path()],
    current_user: CurrentUser,
    session: DatabaseSession,
) -> LearningContentCreateResponse:
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenError("Admin access is required")
    return await _learning_content_service(session).publish_content(content_id)


@router.get(
    "/lessons",
    operation_id="listLearningContents",
    response_model=PaginatedResponse[LearningContentItem],
    summary="List published learning content",
)
async def list_learning_contents(
    pagination: Pagination,
    session: DatabaseSession,
    content_type: Annotated[ContentType | None, Query(alias="type")] = None,
    difficulty: Annotated[JlptLevel | None, Query()] = None,
    topic: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
) -> PaginatedResponse[LearningContentItem]:
    return await _learning_content_service(session).list_contents(
        content_type=content_type,
        difficulty=difficulty,
        topic=topic,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get(
    "/lessons/{content_id}",
    operation_id="getLearningContent",
    response_model=LearningContentDetail,
    summary="Get published learning content detail",
    responses={status.HTTP_404_NOT_FOUND: {"description": "Learning content not found"}},
)
async def get_learning_content(
    content_id: Annotated[uuid.UUID, Path()],
    session: DatabaseSession,
) -> LearningContentDetail:
    return await _learning_content_service(session).get_content(content_id)


@router.get(
    "/shadowing/lessons/{content_id}",
    operation_id="getShadowingContent",
    response_model=ShadowingContentDetail,
    summary="Get shadowing learning content detail",
    responses={status.HTTP_404_NOT_FOUND: {"description": "Shadowing content not found"}},
)
async def get_shadowing_content(
    content_id: Annotated[uuid.UUID, Path()],
    session: DatabaseSession,
) -> ShadowingContentDetail:
    return await _learning_content_service(session).get_shadowing_content(content_id)


@router.get(
    "/dictation/lessons/{content_id}",
    operation_id="getDictationContent",
    response_model=DictationContentDetail,
    summary="Get dictation learning content detail without answers",
    responses={status.HTTP_404_NOT_FOUND: {"description": "Dictation content not found"}},
)
async def get_dictation_content(
    content_id: Annotated[uuid.UUID, Path()],
    session: DatabaseSession,
) -> DictationContentDetail:
    return await _learning_content_service(session).get_dictation_content(content_id)
