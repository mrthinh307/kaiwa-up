import uuid
from typing import Annotated

from fastapi import APIRouter, Path, status

from app.api.dependencies.auth import CurrentUser
from app.api.dependencies.database import DatabaseSession
from app.repositories.dictation import DictationRepository
from app.schemas.dictation import (
    DictationSegmentCheckRequest,
    DictationSegmentCheckResponse,
    DictationStartResponse,
)
from app.schemas.error import ErrorResponse
from app.services.dictation import DictationService

router = APIRouter(prefix="/dictation", tags=["Dictation"])


@router.post(
    "/segments/check",
    operation_id="checkDictationSegment",
    response_model=DictationSegmentCheckResponse,
    summary="Check a Dictation segment answer",
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_409_CONFLICT: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
    },
)
async def check_dictation_segment(
    request: DictationSegmentCheckRequest,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> DictationSegmentCheckResponse:
    service = DictationService(DictationRepository(session))
    return await service.check_segment(
        user_id=current_user.id,
        attempt_id=request.attempt_id,
        segment_index=request.segment_index,
        user_answer=request.user_answer,
    )


@router.post(
    "/{content_id}/start",
    operation_id="startDictationAttempt",
    response_model=DictationStartResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a dictation attempt",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_409_CONFLICT: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
    },
)
async def start_dictation_attempt(
    content_id: Annotated[uuid.UUID, Path(description="Published dictation content ID")],
    current_user: CurrentUser,
    session: DatabaseSession,
) -> DictationStartResponse:
    service = DictationService(DictationRepository(session))
    return await service.start_attempt(user_id=current_user.id, content_id=content_id)
