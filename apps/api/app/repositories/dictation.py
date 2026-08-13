import uuid

from sqlalchemy import func, select

from app.models.attempt import ExerciseAttempt
from app.models.content import LearningContent
from app.models.enums import AttemptStatus, ContentStatus, ContentType
from app.models.user import User
from app.repositories.base import BaseRepository


class DictationRepository(BaseRepository):
    async def get_published_content(self, content_id: uuid.UUID) -> LearningContent | None:
        result = await self.session.execute(
            select(LearningContent).where(
                LearningContent.id == content_id,
                LearningContent.content_type == ContentType.SHADOWING_DICTATION,
                LearningContent.status == ContentStatus.PUBLISHED,
            )
        )
        return result.scalar_one_or_none()

    async def lock_attempt_order(self, user_id: uuid.UUID) -> None:
        await self.session.scalar(select(User.id).where(User.id == user_id).with_for_update())

    async def get_next_attempt_number(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
    ) -> int:
        latest_attempt_number = await self.session.scalar(
            select(func.max(ExerciseAttempt.attempt_number)).where(
                ExerciseAttempt.user_id == user_id,
                ExerciseAttempt.content_id == content_id,
            )
        )
        return (latest_attempt_number or 0) + 1

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
