import uuid
from datetime import datetime
from decimal import Decimal
from typing import NamedTuple

from sqlalchemy import func, select

from app.models.attempt import ExerciseAttempt
from app.models.content import LearningContent
from app.models.enums import AttemptStatus, ContentStatus, ContentType, PracticeMethod
from app.models.gamification import XpTransaction
from app.models.user import User
from app.repositories.base import BaseRepository


class DictationAttemptRow(NamedTuple):
    attempt: ExerciseAttempt
    content: LearningContent


class DictationReviewRow(NamedTuple):
    attempt: ExerciseAttempt
    content: LearningContent
    earned_exp: int | None


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

    async def get_latest_in_progress_attempt(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
    ) -> DictationAttemptRow | None:
        result = (
            await self.session.execute(
                select(ExerciseAttempt, LearningContent)
                .join(LearningContent, LearningContent.id == ExerciseAttempt.content_id)
                .where(
                    ExerciseAttempt.user_id == user_id,
                    ExerciseAttempt.content_id == content_id,
                    ExerciseAttempt.practice_method == PracticeMethod.DICTATION,
                    ExerciseAttempt.status == AttemptStatus.IN_PROGRESS,
                    LearningContent.content_type == ContentType.SHADOWING_DICTATION,
                    LearningContent.status == ContentStatus.PUBLISHED,
                )
                .order_by(ExerciseAttempt.attempt_number.desc())
                .limit(1)
            )
        ).first()
        if result is None:
            return None
        return DictationAttemptRow(attempt=result[0], content=result[1])

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

    async def get_total_attempt_count(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
    ) -> int:
        count = await self.session.scalar(
            select(func.count(ExerciseAttempt.id)).where(
                ExerciseAttempt.user_id == user_id,
                ExerciseAttempt.content_id == content_id,
                ExerciseAttempt.practice_method == PracticeMethod.DICTATION,
            )
        )
        return count or 0

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
            practice_method=PracticeMethod.DICTATION,
            status=AttemptStatus.IN_PROGRESS,
            answer_payload={},
        )
        self.session.add(attempt)
        await self.session.flush()
        return attempt

    async def get_attempt_for_update(
        self,
        attempt_id: uuid.UUID,
    ) -> DictationAttemptRow | None:
        result = (
            await self.session.execute(
                select(ExerciseAttempt, LearningContent)
                .join(LearningContent, LearningContent.id == ExerciseAttempt.content_id)
                .where(
                    ExerciseAttempt.id == attempt_id,
                    ExerciseAttempt.practice_method == PracticeMethod.DICTATION,
                )
                .with_for_update(of=ExerciseAttempt.__table__)
            )
        ).first()
        if result is None:
            return None
        return DictationAttemptRow(attempt=result[0], content=result[1])

    async def get_attempt_for_practice(
        self,
        attempt_id: uuid.UUID,
    ) -> DictationAttemptRow | None:
        result = (
            await self.session.execute(
                select(ExerciseAttempt, LearningContent)
                .join(LearningContent, LearningContent.id == ExerciseAttempt.content_id)
                .where(
                    ExerciseAttempt.id == attempt_id,
                    ExerciseAttempt.practice_method == PracticeMethod.DICTATION,
                    LearningContent.content_type == ContentType.SHADOWING_DICTATION,
                    LearningContent.status == ContentStatus.PUBLISHED,
                )
            )
        ).first()
        if result is None:
            return None
        return DictationAttemptRow(attempt=result[0], content=result[1])

    async def update_answer_payload(
        self,
        attempt: ExerciseAttempt,
        answer_payload: dict[str, object],
    ) -> None:
        attempt.answer_payload = answer_payload
        await self.session.flush()

    async def delete_attempt(self, attempt: ExerciseAttempt) -> None:
        await self.session.delete(attempt)
        await self.session.flush()

    async def complete_attempt(
        self,
        attempt: ExerciseAttempt,
        *,
        score: Decimal,
        correct_count: int,
        total_count: int,
        completed_at: datetime,
    ) -> None:
        attempt.status = AttemptStatus.COMPLETED
        attempt.score = score
        attempt.correct_count = correct_count
        attempt.total_count = total_count
        attempt.submitted_at = completed_at
        attempt.completed_at = completed_at
        await self.session.flush()

    async def get_attempt_for_review(
        self,
        attempt_id: uuid.UUID,
    ) -> DictationReviewRow | None:
        result = (
            await self.session.execute(
                select(ExerciseAttempt, LearningContent, XpTransaction.amount)
                .join(LearningContent, LearningContent.id == ExerciseAttempt.content_id)
                .outerjoin(XpTransaction, XpTransaction.attempt_id == ExerciseAttempt.id)
                .where(
                    ExerciseAttempt.id == attempt_id,
                    ExerciseAttempt.practice_method == PracticeMethod.DICTATION,
                )
            )
        ).first()
        if result is None:
            return None
        return DictationReviewRow(
            attempt=result[0],
            content=result[1],
            earned_exp=result[2],
        )
