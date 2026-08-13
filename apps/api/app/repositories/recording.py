import uuid

from sqlalchemy import func, select

from app.models.attempt import ExerciseAttempt, Recording
from app.models.content import LearningContent
from app.models.enums import AttemptStatus, ContentStatus, ContentType, RecordingKind
from app.models.user import User
from app.repositories.base import BaseRepository


class RecordingRepository(BaseRepository):
    async def get_shadowing_content(self, content_id: uuid.UUID) -> LearningContent | None:
        result = await self.session.execute(
            select(LearningContent).where(
                LearningContent.id == content_id,
                LearningContent.content_type == ContentType.SHADOWING_DICTATION,
                LearningContent.status == ContentStatus.PUBLISHED,
            )
        )
        return result.scalar_one_or_none()

    async def lock_user(self, user_id: uuid.UUID) -> None:
        await self.session.scalar(select(User.id).where(User.id == user_id).with_for_update())

    async def get_next_attempt_number(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
    ) -> int:
        latest = await self.session.scalar(
            select(func.max(ExerciseAttempt.attempt_number)).where(
                ExerciseAttempt.user_id == user_id,
                ExerciseAttempt.content_id == content_id,
            )
        )
        return (latest or 0) + 1

    async def create_attempt(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        attempt_number: int,
    ) -> ExerciseAttempt:
        attempt = ExerciseAttempt(
            user_id=user_id,
            content_id=content_id,
            attempt_number=attempt_number,
            status=AttemptStatus.IN_PROGRESS,
            answer_payload={},
        )
        self.session.add(attempt)
        await self.session.flush()
        return attempt

    async def get_attempt(self, attempt_id: uuid.UUID) -> ExerciseAttempt | None:
        result = await self.session.execute(
            select(ExerciseAttempt).where(ExerciseAttempt.id == attempt_id)
        )
        return result.scalar_one_or_none()

    async def create_recording(
        self,
        *,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
        storage_key: str,
        duration_ms: int | None,
        mime_type: str | None,
    ) -> Recording:
        recording = Recording(
            user_id=user_id,
            attempt_id=attempt_id,
            kind=RecordingKind.SHADOWING,
            storage_key=storage_key,
            duration_ms=duration_ms,
            mime_type=mime_type,
        )
        self.session.add(recording)
        await self.session.flush()
        return recording

    async def get_recording_by_id(self, recording_id: uuid.UUID) -> Recording | None:
        result = await self.session.execute(select(Recording).where(Recording.id == recording_id))
        return result.scalar_one_or_none()
