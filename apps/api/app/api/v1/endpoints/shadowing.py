import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, Path, UploadFile, status

from app.api.dependencies.auth import CurrentUser
from app.api.dependencies.database import DatabaseSession
from app.repositories.recording import RecordingRepository
from app.schemas.error import ErrorResponse
from app.schemas.shadowing import (
    ShadowingRecordingPlaybackResponse,
    ShadowingRecordSegmentResponse,
)
from app.services.shadowing import ShadowingService

router = APIRouter(prefix="/shadowing", tags=["Shadowing"])


@router.post(
    "/{content_id}/record-segment",
    operation_id="recordShadowingSegment",
    response_model=ShadowingRecordSegmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload audio recording for a shadowing segment",
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
async def record_segment(
    content_id: Annotated[uuid.UUID, Path(description="Published shadowing content ID")],
    audio_file: Annotated[UploadFile, File(description="User audio recording file")],
    segment_id: Annotated[str, Form(description="Segment identifier")],
    current_user: CurrentUser,
    session: DatabaseSession,
    attempt_id: Annotated[uuid.UUID | None, Form(description="Optional attempt ID")] = None,
) -> ShadowingRecordSegmentResponse:
    service = ShadowingService(RecordingRepository(session))
    return await service.record_segment(
        user_id=current_user.id,
        content_id=content_id,
        segment_id=segment_id,
        audio_file=audio_file,
        attempt_id=attempt_id,
    )


@router.get(
    "/recordings/{recording_id}",
    operation_id="getShadowingRecordingPlayback",
    response_model=ShadowingRecordingPlaybackResponse,
    summary="Get playback URL for a user's recording",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
async def get_recording_playback(
    recording_id: Annotated[uuid.UUID, Path(description="Recording ID")],
    current_user: CurrentUser,
    session: DatabaseSession,
) -> ShadowingRecordingPlaybackResponse:
    service = ShadowingService(RecordingRepository(session))
    return await service.get_recording_playback(
        user_id=current_user.id,
        recording_id=recording_id,
    )
