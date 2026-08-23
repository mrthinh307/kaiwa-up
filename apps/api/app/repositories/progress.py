from datetime import datetime
from decimal import Decimal
from typing import NamedTuple
from uuid import UUID

from sqlalchemy import ColumnElement, func, select

from app.models.attempt import ExerciseAttempt
from app.models.content import LearningContent
from app.models.enums import AttemptStatus, ContentType, JlptLevel, PracticeMethod
from app.repositories.base import BaseRepository


class AttemptHistoryRow(NamedTuple):
    id: UUID
    content_id: UUID
    content_title: str
    content_type: ContentType
    practice_method: PracticeMethod | None
    attempt_number: int
    status: AttemptStatus
    score: Decimal | None
    completed_at: datetime | None


class InProgressLessonRow(NamedTuple):
    id: UUID
    content_id: UUID
    content_title: str
    content_type: ContentType
    practice_method: PracticeMethod | None
    difficulty: JlptLevel
    attempt_number: int


class AttemptDetailRow(NamedTuple):
    attempt: ExerciseAttempt
    content_type: ContentType


class ProgressRepository(BaseRepository):
    def _history_conditions(
        self,
        user_id: UUID,
        *,
        content_type: ContentType | None,
        practice_method: PracticeMethod | None,
        content_id: UUID | None,
        status: AttemptStatus | None = None,
        search_query: str | None = None,
    ) -> tuple[ColumnElement[bool], ...]:
        conditions: list[ColumnElement[bool]] = [ExerciseAttempt.user_id == user_id]
        if content_type is not None:
            conditions.append(LearningContent.content_type == content_type)
        if practice_method is not None:
            conditions.append(ExerciseAttempt.practice_method == practice_method)
        if content_id is not None:
            conditions.append(ExerciseAttempt.content_id == content_id)
        if status is not None:
            conditions.append(ExerciseAttempt.status == status)
        if search_query:
            conditions.append(LearningContent.title.ilike(f"%{search_query}%"))
        return tuple(conditions)

    async def get_summary(self, user_id: UUID) -> tuple[int, dict[ContentType, int]]:
        total_attempts = (
            await self.session.scalar(
                select(func.count())
                .select_from(ExerciseAttempt)
                .where(ExerciseAttempt.user_id == user_id)
            )
            or 0
        )
        completed_rows = (
            await self.session.execute(
                select(LearningContent.content_type, func.count())
                .join(ExerciseAttempt, ExerciseAttempt.content_id == LearningContent.id)
                .where(
                    ExerciseAttempt.user_id == user_id,
                    ExerciseAttempt.status == AttemptStatus.COMPLETED,
                )
                .group_by(LearningContent.content_type)
            )
        ).all()
        completed_by_type = {content_type: count for content_type, count in completed_rows}
        return total_attempts, completed_by_type

    async def list_attempts(
        self,
        user_id: UUID,
        *,
        content_type: ContentType | None = None,
        practice_method: PracticeMethod | None = None,
        content_id: UUID | None = None,
        status: AttemptStatus | None = None,
        search_query: str | None = None,
        limit: int,
        offset: int,
    ) -> tuple[list[AttemptHistoryRow], int]:
        conditions = self._history_conditions(
            user_id,
            content_type=content_type,
            practice_method=practice_method,
            content_id=content_id,
            status=status,
            search_query=search_query,
        )
        total = (
            await self.session.scalar(
                select(func.count())
                .select_from(ExerciseAttempt)
                .join(LearningContent, LearningContent.id == ExerciseAttempt.content_id)
                .where(*conditions)
            )
            or 0
        )
        results = (
            await self.session.execute(
                select(
                    ExerciseAttempt.id,
                    ExerciseAttempt.content_id,
                    LearningContent.title,
                    LearningContent.content_type,
                    ExerciseAttempt.practice_method,
                    ExerciseAttempt.attempt_number,
                    ExerciseAttempt.status,
                    ExerciseAttempt.score,
                    ExerciseAttempt.completed_at,
                )
                .join(LearningContent, LearningContent.id == ExerciseAttempt.content_id)
                .where(*conditions)
                .order_by(
                    func.coalesce(ExerciseAttempt.completed_at, ExerciseAttempt.started_at).desc()
                )
                .limit(limit)
                .offset(offset)
            )
        ).all()

        items = [
            AttemptHistoryRow(
                id=row.id,
                content_id=row.content_id,
                content_title=row.title,
                content_type=row.content_type,
                practice_method=row.practice_method,
                attempt_number=row.attempt_number,
                status=row.status,
                score=row.score,
                completed_at=row.completed_at,
            )
            for row in results
        ]
        return items, total

    async def get_in_progress_lessons(self, user_id: UUID) -> list[InProgressLessonRow]:
        results = (
            await self.session.execute(
                select(
                    ExerciseAttempt.id,
                    ExerciseAttempt.content_id,
                    LearningContent.title,
                    LearningContent.content_type,
                    ExerciseAttempt.practice_method,
                    LearningContent.difficulty,
                    ExerciseAttempt.attempt_number,
                )
                .join(LearningContent, LearningContent.id == ExerciseAttempt.content_id)
                .where(
                    ExerciseAttempt.user_id == user_id,
                    ExerciseAttempt.status == AttemptStatus.IN_PROGRESS,
                )
                .order_by(ExerciseAttempt.started_at.desc())
            )
        ).all()

        return [
            InProgressLessonRow(
                id=row.id,
                content_id=row.content_id,
                content_title=row.title,
                content_type=row.content_type,
                practice_method=row.practice_method,
                difficulty=row.difficulty,
                attempt_number=row.attempt_number,
            )
            for row in results
        ]

    async def get_attempt_detail(self, attempt_id: UUID) -> AttemptDetailRow | None:
        result = (
            await self.session.execute(
                select(ExerciseAttempt, LearningContent.content_type)
                .join(LearningContent, LearningContent.id == ExerciseAttempt.content_id)
                .where(ExerciseAttempt.id == attempt_id)
            )
        ).first()
        if result is None:
            return None
        return AttemptDetailRow(attempt=result[0], content_type=result[1])
