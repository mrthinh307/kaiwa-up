import uuid
from typing import Any

from fastapi import UploadFile

from app.exceptions import ForbiddenError, NotFoundError
from app.exceptions.shadowing import (
    ShadowingAudioTooLargeError,
    ShadowingContentNotFoundError,
    ShadowingInvalidAudioError,
    ShadowingInvalidSegmentError,
)
from app.models.attempt import ExerciseAttempt
from app.repositories.recording import RecordingRepository
from app.schemas.shadowing import (
    ShadowingRecordingPlaybackResponse,
    ShadowingRecordSegmentResponse,
)
from app.services.storage import StorageService

MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024  # 10MB


class ShadowingService:
    def __init__(
        self,
        repository: RecordingRepository,
        storage_service: StorageService | None = None,
    ) -> None:
        self.repository = repository
        self.storage_service = storage_service or StorageService()

    async def record_segment(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        segment_id: str,
        audio_file: UploadFile,
        attempt_id: uuid.UUID | None = None,
    ) -> ShadowingRecordSegmentResponse:
        content = await self.repository.get_shadowing_content(content_id)
        if content is None:
            raise ShadowingContentNotFoundError()

        if not self._is_valid_segment(content.transcript_ja, segment_id):
            raise ShadowingInvalidSegmentError()

        file_content = await audio_file.read()
        await audio_file.seek(0)

        if not file_content:
            raise ShadowingInvalidAudioError()
        if len(file_content) > MAX_AUDIO_SIZE_BYTES:
            raise ShadowingAudioTooLargeError()

        try:
            attempt: ExerciseAttempt
            if attempt_id is None:
                await self.repository.lock_user(user_id)
                attempt_number = await self.repository.get_next_attempt_number(
                    user_id=user_id,
                    content_id=content_id,
                )
                attempt = await self.repository.create_attempt(
                    user_id=user_id,
                    content_id=content_id,
                    attempt_number=attempt_number,
                )
            else:
                existing_attempt = await self.repository.get_attempt(attempt_id)
                if existing_attempt is None or existing_attempt.content_id != content_id:
                    raise NotFoundError("Attempt not found")
                if existing_attempt.user_id != user_id:
                    raise ForbiddenError()
                attempt = existing_attempt

            storage_key, duration_seconds = await self.storage_service.save_audio(
                user_id=user_id,
                attempt_id=attempt.id,
                file=audio_file,
            )

            recording = await self.repository.create_recording(
                user_id=user_id,
                attempt_id=attempt.id,
                storage_key=storage_key,
                duration_ms=duration_seconds * 1000,
                mime_type=audio_file.content_type,
            )

            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            raise

        return ShadowingRecordSegmentResponse(
            recording_id=recording.id,
            attempt_id=attempt.id,
            segment_id=segment_id,
            storage_key=recording.storage_key,
            duration_seconds=duration_seconds,
            created_at=recording.created_at,
        )

    async def get_recording_playback(
        self,
        *,
        user_id: uuid.UUID,
        recording_id: uuid.UUID,
    ) -> ShadowingRecordingPlaybackResponse:
        recording = await self.repository.get_recording_by_id(recording_id)
        if recording is None:
            raise NotFoundError("Recording not found")

        if recording.user_id != user_id:
            raise ForbiddenError("You do not have access to this recording")

        playback_url = self.storage_service.get_playback_url(recording.storage_key)
        duration_seconds = (recording.duration_ms or 0) // 1000

        return ShadowingRecordingPlaybackResponse(
            recording_id=recording.id,
            playback_url=playback_url,
            duration_seconds=duration_seconds,
            created_at=recording.created_at,
        )

    @staticmethod
    def _is_valid_segment(transcript_ja: list[dict[str, Any]] | None, segment_id: str) -> bool:
        if not transcript_ja:
            return False

        for idx, item in enumerate(transcript_ja):
            if isinstance(item, dict):
                item_id = item.get("id") or item.get("segment_id")
                if item_id is not None and str(item_id) == segment_id:
                    return True

                if segment_id in (str(idx), str(idx + 1)):
                    return True

                if segment_id.lower() in (
                    f"seg_{idx}",
                    f"seg_{idx:03d}",
                    f"seg_{idx + 1}",
                    f"seg_{idx + 1:03d}",
                ):
                    return True

                if str(item.get("start_time_ms")) == segment_id:
                    return True

        return False
