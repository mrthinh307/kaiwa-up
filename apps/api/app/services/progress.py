import math
import uuid

from app.exceptions import ForbiddenError, NotFoundError
from app.models.enums import ContentType
from app.repositories.progress import AttemptHistoryRow, ProgressRepository
from app.schemas.pagination import PaginatedResponse
from app.schemas.progress import (
    ProgressAttemptDetail,
    ProgressAttemptItem,
    ProgressSummaryResponse,
)


class ProgressService:
    def __init__(self, repository: ProgressRepository) -> None:
        self.repository = repository

    async def get_summary(self, user_id: uuid.UUID) -> ProgressSummaryResponse:
        total_attempts, completed_by_type = await self.repository.get_summary(user_id)

        def completed(content_type: ContentType) -> int:
            return completed_by_type.get(content_type, 0)

        return ProgressSummaryResponse(
            shadowing_dictation_completed=completed(ContentType.SHADOWING_DICTATION),
            reflex_completed=completed(ContentType.REFLEX),
            listening_translation_completed=completed(ContentType.LISTENING_TRANSLATION),
            total_completed_attempts=sum(completed_by_type.values()),
            total_attempts=total_attempts,
        )

    async def list_attempts(
        self,
        user_id: uuid.UUID,
        *,
        content_type: ContentType | None,
        content_id: uuid.UUID | None,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[ProgressAttemptItem]:
        attempts, total = await self.repository.list_attempts(
            user_id,
            content_type=content_type,
            content_id=content_id,
            limit=page_size,
            offset=(page - 1) * page_size,
        )
        return PaginatedResponse[ProgressAttemptItem](
            items=[self._to_item(attempt) for attempt in attempts],
            total_items=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    async def get_attempt_detail(
        self,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
    ) -> ProgressAttemptDetail:
        row = await self.repository.get_attempt_detail(attempt_id)
        if row is None:
            raise NotFoundError()
        attempt = row.attempt
        if attempt.user_id != user_id:
            raise ForbiddenError()
        return ProgressAttemptDetail(
            id=attempt.id,
            content_id=attempt.content_id,
            content_type=row.content_type,
            attempt_number=attempt.attempt_number,
            status=attempt.status,
            score=float(attempt.score) if attempt.score is not None else None,
            answer_payload=attempt.answer_payload,
            completed_at=attempt.completed_at,
        )

    @staticmethod
    def _to_item(attempt: AttemptHistoryRow) -> ProgressAttemptItem:
        return ProgressAttemptItem(
            id=attempt.id,
            content_id=attempt.content_id,
            content_title=attempt.content_title,
            content_type=attempt.content_type,
            attempt_number=attempt.attempt_number,
            status=attempt.status,
            score=float(attempt.score) if attempt.score is not None else None,
            completed_at=attempt.completed_at,
        )
