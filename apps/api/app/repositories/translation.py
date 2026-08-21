"""Persistence operations for Listening & Translation."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import NamedTuple

from sqlalchemy import ColumnElement, exists, func, select
from sqlalchemy.orm import selectinload

from app.models.attempt import AiEvaluation, ExerciseAttempt
from app.models.content import LearningContent, TranslationExercise
from app.models.enums import (
    AiEvaluationStatus,
    AttemptStatus,
    ContentStatus,
    ContentType,
    JlptLevel,
)
from app.models.gamification import XpTransaction
from app.models.user import User, UserProgress
from app.repositories.base import BaseRepository


class TranslationResultRow(NamedTuple):
    attempt: ExerciseAttempt
    evaluation: AiEvaluation
    exp_earned: int | None


class TranslationRepository(BaseRepository):
    @staticmethod
    def _published_conditions() -> tuple[ColumnElement[bool], ...]:
        return (
            LearningContent.content_type == ContentType.LISTENING_TRANSLATION,
            LearningContent.status == ContentStatus.PUBLISHED,
        )

    async def list_published_lessons(
        self,
        *,
        user_id: uuid.UUID,
        difficulty: JlptLevel | None,
        limit: int,
        offset: int,
    ) -> tuple[list[tuple[LearningContent, bool]], int]:
        conditions = list(self._published_conditions())
        if difficulty is not None:
            conditions.append(LearningContent.difficulty == difficulty)

        completed = exists(
            select(ExerciseAttempt.id).where(
                ExerciseAttempt.user_id == user_id,
                ExerciseAttempt.content_id == LearningContent.id,
                ExerciseAttempt.status == AttemptStatus.COMPLETED,
            )
        ).label("is_completed")
        total = (
            await self.session.scalar(
                select(func.count())
                .select_from(LearningContent)
                .join(TranslationExercise)
                .where(*conditions)
            )
            or 0
        )
        rows = (
            await self.session.execute(
                select(LearningContent, completed)
                .join(TranslationExercise)
                .options(selectinload(LearningContent.translation))
                .where(*conditions)
                .order_by(
                    LearningContent.published_at.desc().nullslast(),
                    LearningContent.id.asc(),
                )
                .limit(limit)
                .offset(offset)
            )
        ).all()
        return [(row[0], row[1]) for row in rows], total

    async def get_published_lesson(self, content_id: uuid.UUID) -> LearningContent | None:
        result = await self.session.execute(
            select(LearningContent)
            .options(selectinload(LearningContent.translation))
            .where(
                LearningContent.id == content_id,
                *self._published_conditions(),
            )
        )
        return result.scalar_one_or_none()

    async def is_completed(self, *, user_id: uuid.UUID, content_id: uuid.UUID) -> bool:
        return bool(
            await self.session.scalar(
                select(
                    exists().where(
                        ExerciseAttempt.user_id == user_id,
                        ExerciseAttempt.content_id == content_id,
                        ExerciseAttempt.status == AttemptStatus.COMPLETED,
                    )
                )
            )
        )

    async def lock_user(self, user_id: uuid.UUID) -> None:
        await self.session.scalar(select(User.id).where(User.id == user_id).with_for_update())

    async def next_attempt_number(self, *, user_id: uuid.UUID, content_id: uuid.UUID) -> int:
        latest = await self.session.scalar(
            select(func.max(ExerciseAttempt.attempt_number)).where(
                ExerciseAttempt.user_id == user_id,
                ExerciseAttempt.content_id == content_id,
            )
        )
        return (latest or 0) + 1

    async def get_latest_in_progress_attempt_for_update(
        self, *, user_id: uuid.UUID, content_id: uuid.UUID
    ) -> ExerciseAttempt | None:
        result = await self.session.execute(
            select(ExerciseAttempt)
            .where(
                ExerciseAttempt.user_id == user_id,
                ExerciseAttempt.content_id == content_id,
                ExerciseAttempt.status == AttemptStatus.IN_PROGRESS,
            )
            .order_by(ExerciseAttempt.attempt_number.desc())
            .limit(1)
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def create_attempt(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        attempt_number: int,
        translation_vi: str,
        submitted_at: datetime,
    ) -> ExerciseAttempt:
        attempt = ExerciseAttempt(
            user_id=user_id,
            content_id=content_id,
            attempt_number=attempt_number,
            status=AttemptStatus.IN_PROGRESS,
            submitted_at=submitted_at,
            answer_payload={"translation_vi": translation_vi},
        )
        self.session.add(attempt)
        await self.session.flush()
        return attempt

    async def update_attempt_translation(
        self, attempt: ExerciseAttempt, *, translation_vi: str, submitted_at: datetime
    ) -> None:
        attempt.answer_payload = {"translation_vi": translation_vi}
        attempt.submitted_at = submitted_at
        await self.session.flush()

    async def get_latest_evaluation_for_update(self, attempt_id: uuid.UUID) -> AiEvaluation | None:
        result = await self.session.execute(
            select(AiEvaluation)
            .where(AiEvaluation.attempt_id == attempt_id)
            .order_by(AiEvaluation.created_at.desc(), AiEvaluation.id.desc())
            .limit(1)
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def create_pending_evaluation(self, attempt_id: uuid.UUID) -> AiEvaluation:
        evaluation = AiEvaluation(
            attempt_id=attempt_id,
            status=AiEvaluationStatus.PENDING,
        )
        self.session.add(evaluation)
        await self.session.flush()
        return evaluation

    async def reset_evaluation(self, evaluation: AiEvaluation) -> None:
        evaluation.status = AiEvaluationStatus.PENDING
        evaluation.similarity_score = None
        evaluation.feedback = None
        evaluation.details = None
        evaluation.error_message = None
        evaluation.completed_at = None
        await self.session.flush()

    async def mark_evaluation_failed(
        self, evaluation: AiEvaluation, *, error_code: str, completed_at: datetime
    ) -> None:
        evaluation.status = AiEvaluationStatus.FAILED
        evaluation.error_message = error_code
        evaluation.completed_at = completed_at
        await self.session.flush()

    async def get_attempt_for_update(
        self, *, attempt_id: uuid.UUID, user_id: uuid.UUID
    ) -> ExerciseAttempt | None:
        result = await self.session.execute(
            select(ExerciseAttempt)
            .where(
                ExerciseAttempt.id == attempt_id,
                ExerciseAttempt.user_id == user_id,
            )
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def complete_evaluation(
        self,
        evaluation: AiEvaluation,
        *,
        score: int,
        feedback: str,
        details: dict[str, object],
        completed_at: datetime,
    ) -> None:
        evaluation.status = AiEvaluationStatus.COMPLETED
        evaluation.similarity_score = Decimal(score)
        evaluation.feedback = feedback
        evaluation.details = details
        evaluation.error_message = None
        evaluation.completed_at = completed_at
        await self.session.flush()

    async def complete_attempt(
        self, attempt: ExerciseAttempt, *, score: int, completed_at: datetime
    ) -> None:
        attempt.status = AttemptStatus.COMPLETED
        attempt.score = Decimal(score)
        attempt.completed_at = completed_at
        await self.session.flush()

    async def get_completed_result(
        self, *, user_id: uuid.UUID, content_id: uuid.UUID
    ) -> TranslationResultRow | None:
        row = (
            await self.session.execute(
                select(ExerciseAttempt, AiEvaluation, XpTransaction.amount)
                .join(
                    AiEvaluation,
                    AiEvaluation.attempt_id == ExerciseAttempt.id,
                )
                .outerjoin(XpTransaction, XpTransaction.attempt_id == ExerciseAttempt.id)
                .where(
                    ExerciseAttempt.user_id == user_id,
                    ExerciseAttempt.content_id == content_id,
                    ExerciseAttempt.status == AttemptStatus.COMPLETED,
                    AiEvaluation.status == AiEvaluationStatus.COMPLETED,
                )
                .order_by(ExerciseAttempt.attempt_number.desc())
                .limit(1)
            )
        ).first()
        if row is None:
            return None
        return TranslationResultRow(attempt=row[0], evaluation=row[1], exp_earned=row[2])

    async def sync_completed_content_count(self, user_id: uuid.UUID) -> None:
        completed_count = await self.session.scalar(
            select(func.count(func.distinct(ExerciseAttempt.content_id))).where(
                ExerciseAttempt.user_id == user_id,
                ExerciseAttempt.status == AttemptStatus.COMPLETED,
            )
        )
        progress = await self.session.get(UserProgress, user_id)
        if progress is not None:
            progress.completed_content_count = completed_count or 0
            await self.session.flush()
