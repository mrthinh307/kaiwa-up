import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, Path, UploadFile, status

from app.api.dependencies.ai import AiGatewayDep
from app.api.dependencies.auth import CurrentUser
from app.api.dependencies.database import DatabaseSession
from app.repositories.recording import RecordingRepository
from app.schemas.error import ErrorResponse
from app.schemas.shadowing import (
    ShadowingAttemptPracticeResponse,
    ShadowingAttemptReviewResponse,
    ShadowingRecordContinuousResponse,
    ShadowingRecordingPlaybackResponse,
    ShadowingRecordSegmentResponse,
    ShadowingResumeResponse,
    ShadowingStartRequest,
    ShadowingStartResponse,
    ShadowingSubmitRequest,
    ShadowingSubmitResponse,
)
from app.services.shadowing import ShadowingService

router = APIRouter(prefix="/shadowing", tags=["Shadowing"])


@router.post(
    "/{content_id}/start",
    operation_id="startShadowingAttempt",
    response_model=ShadowingStartResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a Shadowing attempt",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_409_CONFLICT: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
    },
)
async def start_shadowing_attempt(
    content_id: Annotated[uuid.UUID, Path(description="Published shadowing content ID")],
    payload: ShadowingStartRequest,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> ShadowingStartResponse:
    service = ShadowingService(RecordingRepository(session))
    return await service.start_attempt(
        user_id=current_user.id,
        content_id=content_id,
        mode=payload.mode,
    )


@router.get(
    "/attempts/{attempt_id}/practice",
    operation_id="getShadowingAttemptPractice",
    response_model=ShadowingAttemptPracticeResponse,
    summary="Load an in-progress Shadowing attempt for practice",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_409_CONFLICT: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
    },
)
async def get_shadowing_attempt_practice(
    attempt_id: Annotated[uuid.UUID, Path(description="Shadowing attempt ID")],
    current_user: CurrentUser,
    session: DatabaseSession,
) -> ShadowingAttemptPracticeResponse:
    service = ShadowingService(RecordingRepository(session))
    return await service.get_attempt_practice(
        user_id=current_user.id,
        attempt_id=attempt_id,
    )


@router.get(
    "/{content_id}/in-progress",
    operation_id="getInProgressShadowingAttempt",
    response_model=ShadowingResumeResponse,
    summary="Resume the latest in-progress Shadowing attempt",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
    },
)
async def get_in_progress_shadowing_attempt(
    content_id: Annotated[uuid.UUID, Path(description="Published shadowing content ID")],
    current_user: CurrentUser,
    session: DatabaseSession,
) -> ShadowingResumeResponse:
    service = ShadowingService(RecordingRepository(session))
    return await service.get_in_progress_attempt(user_id=current_user.id, content_id=content_id)


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
        status.HTTP_409_CONFLICT: {"model": ErrorResponse},
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


@router.post(
    "/{content_id}/record-continuous",
    operation_id="recordShadowingContinuous",
    response_model=ShadowingRecordContinuousResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload audio recording for continuous full-material shadowing",
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_409_CONFLICT: {"model": ErrorResponse},
    },
)
async def record_continuous(
    content_id: Annotated[uuid.UUID, Path(description="Published shadowing content ID")],
    audio_file: Annotated[UploadFile, File(description="User continuous audio recording file")],
    current_user: CurrentUser,
    session: DatabaseSession,
    attempt_id: Annotated[uuid.UUID | None, Form(description="Optional attempt ID")] = None,
    duration_seconds: Annotated[
        int | None, Form(description="Optional continuous duration in seconds")
    ] = None,
) -> ShadowingRecordContinuousResponse:
    service = ShadowingService(RecordingRepository(session))
    return await service.record_continuous(
        user_id=current_user.id,
        content_id=content_id,
        audio_file=audio_file,
        duration_seconds=duration_seconds,
        attempt_id=attempt_id,
    )


@router.post(
    "/{content_id}/submit",
    operation_id="submitShadowingAttempt",
    response_model=ShadowingSubmitResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit and finalize a shadowing attempt",
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_409_CONFLICT: {"model": ErrorResponse},
    },
)
async def submit_attempt(
    content_id: Annotated[uuid.UUID, Path(description="Published shadowing content ID")],
    payload: ShadowingSubmitRequest,
    current_user: CurrentUser,
    session: DatabaseSession,
    ai_gateway: AiGatewayDep,
) -> ShadowingSubmitResponse:
    service = ShadowingService(RecordingRepository(session), ai_gateway=ai_gateway)
    return await service.submit_attempt(
        user_id=current_user.id,
        content_id=content_id,
        attempt_id=payload.attempt_id,
        replay_count=payload.replay_count,
        request_ai_review=payload.request_ai_review,
    )


@router.get(
    "/attempts/{attempt_id}/review",
    operation_id="getShadowingAttemptReview",
    response_model=ShadowingAttemptReviewResponse,
    summary="Review a Shadowing attempt with segment recordings",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
async def get_attempt_review(
    attempt_id: Annotated[uuid.UUID, Path(description="Shadowing attempt ID")],
    current_user: CurrentUser,
    session: DatabaseSession,
    ai_gateway: AiGatewayDep,
) -> ShadowingAttemptReviewResponse:
    service = ShadowingService(RecordingRepository(session), ai_gateway=ai_gateway)
    return await service.get_attempt_review(
        user_id=current_user.id,
        attempt_id=attempt_id,
    )


@router.get(
    "/recordings/{recording_id}",
    operation_id="getShadowingRecording",
    response_model=ShadowingRecordingPlaybackResponse,
    summary="Get presigned or public playback URL for a user recording",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
@router.get(
    "/recordings/{recording_id}/playback",
    operation_id="getShadowingRecordingPlayback",
    response_model=ShadowingRecordingPlaybackResponse,
    summary="Get presigned or public playback URL for a user recording",
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
