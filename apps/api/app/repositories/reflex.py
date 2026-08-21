import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.attempt import AiEvaluation, ExerciseAttempt, ReviewSchedule
from app.models.content import LearningContent
from app.models.enums import (
    AiEvaluationStatus,
    AttemptStatus,
    ContentStatus,
    ContentType,
    JlptLevel,
)
from app.models.user import User, UserProgress
from app.repositories.base import BaseRepository


class ReflexRepository(BaseRepository):
    async def list_published_lessons(
        self, *, difficulty: JlptLevel | None, offset: int, limit: int
    ) -> list[LearningContent]:
        result = await self.session.scalars(
            select(LearningContent)
            .options(selectinload(LearningContent.reflex))
            .where(
                LearningContent.content_type == ContentType.REFLEX,
                LearningContent.status == ContentStatus.PUBLISHED,
                *([LearningContent.difficulty == difficulty] if difficulty is not None else []),
            )
            .order_by(LearningContent.published_at.desc(), LearningContent.id)
            .offset(offset)
            .limit(limit)
        )
        return list(result.all())

    async def count_published_lessons(self, *, difficulty: JlptLevel | None) -> int:
        query = (
            select(func.count())
            .select_from(LearningContent)
            .where(
                LearningContent.content_type == ContentType.REFLEX,
                LearningContent.status == ContentStatus.PUBLISHED,
            )
        )
        if difficulty is not None:
            query = query.where(LearningContent.difficulty == difficulty)
        return await self.session.scalar(query) or 0

    async def completed_content_ids(
        self, *, user_id: uuid.UUID, content_ids: list[uuid.UUID]
    ) -> set[uuid.UUID]:
        if not content_ids:
            return set()
        result = await self.session.scalars(
            select(ExerciseAttempt.content_id)
            .where(
                ExerciseAttempt.user_id == user_id,
                ExerciseAttempt.content_id.in_(content_ids),
                ExerciseAttempt.status == AttemptStatus.COMPLETED,
            )
            .distinct()
        )
        return set(result.all())

    async def get_published_lesson(self, content_id: uuid.UUID) -> LearningContent | None:
        result = await self.session.execute(
            select(LearningContent)
            .options(selectinload(LearningContent.reflex))
            .where(
                LearningContent.id == content_id,
                LearningContent.content_type == ContentType.REFLEX,
                LearningContent.status == ContentStatus.PUBLISHED,
            )
        )
        return result.scalar_one_or_none()

    async def lock_user(self, user_id: uuid.UUID) -> None:
        await self.session.scalar(select(User.id).where(User.id == user_id).with_for_update())

    async def next_attempt_number(self, *, user_id: uuid.UUID, content_id: uuid.UUID) -> int:
        latest = await self.session.scalar(
            select(ExerciseAttempt.attempt_number)
            .where(
                ExerciseAttempt.user_id == user_id,
                ExerciseAttempt.content_id == content_id,
            )
            .order_by(ExerciseAttempt.attempt_number.desc())
            .limit(1)
        )
        return (latest or 0) + 1

    async def create_completed_attempt(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        attempt_number: int,
        score: int,
        started_at: datetime,
        response_started_at: datetime,
        is_on_time: bool,
        transcript: str,
        completed_at: datetime,
    ) -> ExerciseAttempt:
        attempt = ExerciseAttempt(
            user_id=user_id,
            content_id=content_id,
            attempt_number=attempt_number,
            status=AttemptStatus.COMPLETED,
            started_at=started_at,
            score=Decimal(score),
            response_started_at=response_started_at,
            response_started_on_time=is_on_time,
            submitted_at=completed_at,
            completed_at=completed_at,
            answer_payload={"transcript": transcript},
        )
        self.session.add(attempt)
        await self.session.flush()
        return attempt

    async def create_evaluation(
        self,
        *,
        attempt_id: uuid.UUID,
        score: int,
        feedback: str,
        details: dict[str, object],
        completed_at: datetime,
    ) -> AiEvaluation:
        evaluation = AiEvaluation(
            attempt_id=attempt_id,
            status=AiEvaluationStatus.COMPLETED,
            similarity_score=Decimal(score),
            feedback=feedback,
            details=details,
            completed_at=completed_at,
        )
        self.session.add(evaluation)
        await self.session.flush()
        return evaluation

    async def upsert_schedule(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        due_at: datetime,
        interval_days: int,
        attempt_id: uuid.UUID,
    ) -> ReviewSchedule:
        schedule = await self.session.get(
            ReviewSchedule, (user_id, content_id), with_for_update=True
        )
        if schedule is None:
            schedule = ReviewSchedule(
                user_id=user_id,
                content_id=content_id,
                due_at=due_at,
                interval_days=interval_days,
                ease_factor=Decimal("2.50"),
                repetitions=1,
                last_attempt_id=attempt_id,
            )
            self.session.add(schedule)
        else:
            schedule.due_at = due_at
            schedule.interval_days = interval_days
            schedule.repetitions += 1
            schedule.last_attempt_id = attempt_id
        await self.session.flush()
        return schedule

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

    async def list_schedules(
        self, *, user_id: uuid.UUID, due_before: datetime | None = None
    ) -> list[tuple[ReviewSchedule, str, Decimal | None]]:
        query = (
            select(ReviewSchedule, LearningContent.title, ExerciseAttempt.score)
            .join(LearningContent, LearningContent.id == ReviewSchedule.content_id)
            .outerjoin(ExerciseAttempt, ExerciseAttempt.id == ReviewSchedule.last_attempt_id)
            .where(ReviewSchedule.user_id == user_id)
        )
        if due_before is not None:
            query = query.where(ReviewSchedule.due_at <= due_before)
        rows = (await self.session.execute(query.order_by(ReviewSchedule.due_at))).all()
        return [(row[0], row[1], row[2]) for row in rows]
