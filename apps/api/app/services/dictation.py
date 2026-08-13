import uuid

from pydantic import ValidationError

from app.exceptions import ForbiddenError, NotFoundError
from app.exceptions.dictation import (
    DictationAttemptNotInProgressError,
    DictationContentUnavailableError,
    DictationInvalidSegmentIndexError,
)
from app.models.content import LearningContent
from app.models.enums import AttemptStatus, ContentType
from app.repositories.dictation import DictationRepository
from app.schemas.dictation import (
    DictationAnswerPayload,
    DictationSegmentCheckResponse,
    DictationSegmentItem,
    DictationStartResponse,
    DictationTranscriptSegment,
)

IGNORED_DICTATION_CHARACTERS = frozenset({"。", "、"})


def normalize_dictation_text(text: str) -> str:
    return "".join(
        character
        for character in text
        if not character.isspace() and character not in IGNORED_DICTATION_CHARACTERS
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

        transcript_segments = self._transcript_segments(content)
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
            total_segments=len(transcript_segments),
            segments=[
                DictationSegmentItem(
                    segment_index=index,
                    start_time_ms=segment.start_time_ms,
                    end_time_ms=segment.end_time_ms,
                )
                for index, segment in enumerate(transcript_segments)
            ],
        )

    async def check_segment(
        self,
        *,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
        segment_index: int,
        user_answer: str,
    ) -> DictationSegmentCheckResponse:
        try:
            row = await self.repository.get_attempt_for_update(attempt_id)
            if row is None or row.content.content_type != ContentType.SHADOWING_DICTATION:
                raise NotFoundError("Dictation attempt not found")
            if row.attempt.user_id != user_id:
                raise ForbiddenError()
            if row.attempt.status != AttemptStatus.IN_PROGRESS:
                raise DictationAttemptNotInProgressError()

            transcript_segments = self._transcript_segments(row.content)
            if segment_index < 0 or segment_index >= len(transcript_segments):
                raise DictationInvalidSegmentIndexError(
                    segment_index=segment_index,
                    total_segments=len(transcript_segments),
                )

            correct_script = transcript_segments[segment_index].script
            result = DictationSegmentCheckResponse(
                segment_index=segment_index,
                is_correct=(
                    normalize_dictation_text(user_answer)
                    == normalize_dictation_text(correct_script)
                ),
                user_answer=user_answer,
                correct_script=correct_script,
                is_last_segment=segment_index == len(transcript_segments) - 1,
            )
            answer_payload = DictationAnswerPayload.model_validate(row.attempt.answer_payload or {})
            results_by_index = {
                stored_result.segment_index: stored_result
                for stored_result in answer_payload.segments
            }
            results_by_index[segment_index] = result
            updated_payload: dict[str, object] = {
                "segments": [
                    stored_result.model_dump()
                    for stored_result in sorted(
                        results_by_index.values(),
                        key=lambda stored_result: stored_result.segment_index,
                    )
                ]
            }
            await self.repository.update_answer_payload(row.attempt, updated_payload)
            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            raise

        return result

    @staticmethod
    def _transcript_segments(content: LearningContent) -> list[DictationTranscriptSegment]:
        if not content.transcript_ja:
            raise DictationContentUnavailableError()

        try:
            return [
                DictationTranscriptSegment.model_validate(segment)
                for segment in content.transcript_ja
            ]
        except ValidationError as exc:
            raise DictationContentUnavailableError() from exc
