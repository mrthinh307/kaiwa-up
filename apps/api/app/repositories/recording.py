import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select

from app.models.attempt import AiEvaluation, ExerciseAttempt, Recording
from app.models.content import LearningContent
from app.models.enums import (
    AiEvaluationStatus,
    AttemptStatus,
    ContentStatus,
    ContentType,
    PracticeMethod,
    RecordingKind,
)
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
        answer_payload: dict[str, object] | None = None,
    ) -> ExerciseAttempt:
        attempt = ExerciseAttempt(
            user_id=user_id,
            content_id=content_id,
            attempt_number=attempt_number,
            practice_method=PracticeMethod.SHADOWING,
            status=AttemptStatus.IN_PROGRESS,
            answer_payload=answer_payload or {},
        )
        self.session.add(attempt)
        await self.session.flush()
        return attempt

    async def get_attempt(self, attempt_id: uuid.UUID) -> ExerciseAttempt | None:
        result = await self.session.execute(
            select(ExerciseAttempt).where(
                ExerciseAttempt.id == attempt_id,
                ExerciseAttempt.practice_method == PracticeMethod.SHADOWING,
            )
        )
        return result.scalar_one_or_none()

    async def get_attempt_with_content(
        self,
        attempt_id: uuid.UUID,
    ) -> tuple[ExerciseAttempt, LearningContent] | None:
        result = (
            await self.session.execute(
                select(ExerciseAttempt, LearningContent)
                .join(LearningContent, LearningContent.id == ExerciseAttempt.content_id)
                .where(
                    ExerciseAttempt.id == attempt_id,
                    ExerciseAttempt.practice_method == PracticeMethod.SHADOWING,
                )
            )
        ).first()
        if result is None:
            return None
        return result[0], result[1]

    async def get_latest_in_progress_attempt(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
    ) -> tuple[ExerciseAttempt, LearningContent] | None:
        result = (
            await self.session.execute(
                select(ExerciseAttempt, LearningContent)
                .join(LearningContent, LearningContent.id == ExerciseAttempt.content_id)
                .where(
                    ExerciseAttempt.user_id == user_id,
                    ExerciseAttempt.content_id == content_id,
                    ExerciseAttempt.practice_method == PracticeMethod.SHADOWING,
                    ExerciseAttempt.status == AttemptStatus.IN_PROGRESS,
                )
                .order_by(ExerciseAttempt.started_at.desc())
            )
        ).first()
        if result is None:
            return None
        return result[0], result[1]

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
                ExerciseAttempt.practice_method == PracticeMethod.SHADOWING,
            )
        )
        return count or 0

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

    async def get_attempt_for_update(
        self, attempt_id: uuid.UUID
    ) -> tuple[ExerciseAttempt, LearningContent] | None:
        result = (
            await self.session.execute(
                select(ExerciseAttempt, LearningContent)
                .join(LearningContent, LearningContent.id == ExerciseAttempt.content_id)
                .where(
                    ExerciseAttempt.id == attempt_id,
                    ExerciseAttempt.practice_method == PracticeMethod.SHADOWING,
                )
                .with_for_update(of=ExerciseAttempt)
            )
        ).first()
        if result is None:
            return None
        return result[0], result[1]

    async def get_recordings_by_attempt(self, attempt_id: uuid.UUID) -> list[Recording]:
        result = await self.session.execute(
            select(Recording)
            .where(Recording.attempt_id == attempt_id)
            .order_by(Recording.created_at.asc())
        )
        return list(result.scalars().all())

    async def count_prior_completed_attempts(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        exclude_attempt_id: uuid.UUID,
    ) -> int:
        count = await self.session.scalar(
            select(func.count(ExerciseAttempt.id)).where(
                ExerciseAttempt.user_id == user_id,
                ExerciseAttempt.content_id == content_id,
                ExerciseAttempt.status == AttemptStatus.COMPLETED,
                ExerciseAttempt.id != exclude_attempt_id,
            )
        )
        return count or 0

    async def update_answer_payload(
        self,
        attempt: ExerciseAttempt,
        answer_payload: dict[str, object],
    ) -> None:
        attempt.answer_payload = answer_payload

    async def complete_attempt(
        self,
        attempt: ExerciseAttempt,
        *,
        score: Decimal,
        correct_count: int,
        total_count: int,
        answer_payload: dict[str, object],
        completed_at: datetime,
    ) -> None:
        attempt.status = AttemptStatus.COMPLETED
        attempt.score = score
        attempt.correct_count = correct_count
        attempt.total_count = total_count
        attempt.answer_payload = answer_payload
        attempt.submitted_at = completed_at
        attempt.completed_at = completed_at

    async def get_attempt_for_review(
        self, attempt_id: uuid.UUID
    ) -> tuple[ExerciseAttempt, LearningContent, int | None] | None:
        from app.models.gamification import XpTransaction

        result = (
            await self.session.execute(
                select(ExerciseAttempt, LearningContent, XpTransaction.amount)
                .join(LearningContent, LearningContent.id == ExerciseAttempt.content_id)
                .outerjoin(XpTransaction, XpTransaction.attempt_id == ExerciseAttempt.id)
                .where(
                    ExerciseAttempt.id == attempt_id,
                    ExerciseAttempt.practice_method == PracticeMethod.SHADOWING,
                )
            )
        ).first()
        if result is None:
            return None
        return result[0], result[1], result[2]

    async def create_ai_evaluation(
        self,
        *,
        attempt_id: uuid.UUID,
        recording_id: uuid.UUID | None = None,
        status: AiEvaluationStatus = AiEvaluationStatus.COMPLETED,
        provider: str | None = None,
        model: str | None = None,
        similarity_score: Decimal | None = None,
        fluency_score: Decimal | None = None,
        feedback: str | None = None,
        details: dict[str, object] | None = None,
        error_message: str | None = None,
        completed_at: datetime | None = None,
    ) -> AiEvaluation:
        evaluation = AiEvaluation(
            attempt_id=attempt_id,
            recording_id=recording_id,
            status=status,
            provider=provider,
            model=model,
            similarity_score=similarity_score,
            fluency_score=fluency_score,
            feedback=feedback,
            details=details,
            error_message=error_message,
            completed_at=completed_at,
        )
        self.session.add(evaluation)
        await self.session.flush()
        return evaluation

    async def get_latest_ai_evaluation(self, attempt_id: uuid.UUID) -> AiEvaluation | None:
        result = await self.session.execute(
            select(AiEvaluation)
            .where(AiEvaluation.attempt_id == attempt_id)
            .order_by(AiEvaluation.created_at.desc())
        )
        return result.scalars().first()

    async def update_recording_transcription(
        self,
        recording: Recording,
        transcription_ja: str,
    ) -> None:
        recording.transcription_ja = transcription_ja
