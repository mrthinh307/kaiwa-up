import uuid

from pydantic import ValidationError

from app.exceptions import NotFoundError
from app.exceptions.dictation import DictationContentUnavailableError
from app.models.content import LearningContent
from app.repositories.dictation import DictationRepository
from app.schemas.dictation import (
    DictationSegmentItem,
    DictationStartResponse,
    DictationTranscriptSegment,
)


class DictationService:
    def __init__(self, repository: DictationRepository) -> None:
        self.repository = repository

    async def start_attempt(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
    ) -> DictationStartResponse:
        content = await self.repository.get_published_content(content_id)
        if content is None:
            raise NotFoundError("Dictation content not found")

        segments = self._public_segments(content)
        if not content.audio_url:
            raise DictationContentUnavailableError()

        try:
            await self.repository.lock_attempt_order(user_id)
            attempt_number = await self.repository.get_next_attempt_number(
                user_id=user_id,
                content_id=content_id,
            )
            attempt = await self.repository.create_attempt(
                user_id=user_id,
                content_id=content_id,
                attempt_number=attempt_number,
            )
            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            raise

        return DictationStartResponse(
            attempt_id=attempt.id,
            content_id=content.id,
            attempt_number=attempt.attempt_number,
            audio_url=content.audio_url,
            total_segments=len(segments),
            segments=segments,
        )

    @staticmethod
    def _public_segments(content: LearningContent) -> list[DictationSegmentItem]:
        if not content.transcript_ja:
            raise DictationContentUnavailableError()

        try:
            transcript_segments = [
                DictationTranscriptSegment.model_validate(segment)
                for segment in content.transcript_ja
            ]
        except ValidationError as exc:
            raise DictationContentUnavailableError() from exc

        return [
            DictationSegmentItem(
                segment_index=index,
                start_time_ms=segment.start_time_ms,
                end_time_ms=segment.end_time_ms,
            )
            for index, segment in enumerate(transcript_segments)
        ]
