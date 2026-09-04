import unicodedata
import uuid
from decimal import ROUND_HALF_UP, Decimal
from typing import Protocol, cast

from pydantic import ValidationError
from pykakasi import kakasi

from app.exceptions import AttemptAlreadyInProgressError, ForbiddenError, NotFoundError
from app.exceptions.dictation import (
    DictationAttemptNotInProgressError,
    DictationContentUnavailableError,
    DictationExperienceAlreadyAwardedError,
    DictationInvalidSegmentIndexError,
)
from app.models.content import LearningContent
from app.models.enums import AttemptStatus, ContentStatus, ContentType, PracticeMethod
from app.repositories.dictation import DictationAttemptRow, DictationRepository
from app.repositories.gamification import GamificationRepository
from app.schemas.dictation import (
    DictationAnswerPayload,
    DictationAttemptPracticeResponse,
    DictationAttemptReviewResponse,
    DictationCompleteResponse,
    DictationResumeResponse,
    DictationSegmentCheckResponse,
    DictationSegmentItem,
    DictationSegmentReview,
    DictationStartResponse,
    DictationTranscriptSegment,
)
from app.schemas.learning_content import DictationContentDetail, DictationPromptSegment
from app.services.gamification import GamificationService
from app.utils.datetime_utils import utc_now


class _KanaConverter(Protocol):
    def convert(self, text: str) -> list[dict[str, str]]: ...


_KAKASI = cast(_KanaConverter, kakasi())  # type: ignore[no-untyped-call]
_FULL_WIDTH_DIGIT_TRANSLATION = str.maketrans("０１２３４５６７８９", "0123456789")


def normalize_dictation_text(text: str) -> str:
    text_without_spacing_or_punctuation = "".join(
        character
        for character in unicodedata.normalize("NFC", text).translate(_FULL_WIDTH_DIGIT_TRANSLATION)
        if not character.isspace() and not unicodedata.category(character).startswith("P")
    )
    return "".join(
        converted_fragment["hira"]
        for converted_fragment in _KAKASI.convert(text_without_spacing_or_punctuation)
    )


def calculate_dictation_score(*, correct_count: int, total_count: int) -> Decimal:
    return (Decimal(correct_count) * Decimal(100) / Decimal(total_count)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def calculate_dictation_exp(*, answered_count: int, total_count: int) -> int:
    if answered_count <= 0:
        return 0

    completion_percentage = Decimal(min(answered_count, total_count)) * 100 / Decimal(total_count)
    if completion_percentage < 5:
        return 5
    if completion_percentage < 25:
        return 15
    if completion_percentage < 50:
        return 25
    if completion_percentage < 75:
        return 40
    return 50


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
            existing_attempt = await self.repository.get_latest_in_progress_attempt(
                user_id=user_id,
                content_id=content_id,
            )
            if existing_attempt is not None:
                raise AttemptAlreadyInProgressError(
                    attempt_id=existing_attempt.attempt.id,
                    practice_method=PracticeMethod.DICTATION,
                )
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

    async def resume_attempt(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
    ) -> DictationResumeResponse:
        row = await self.repository.get_latest_in_progress_attempt(
            user_id=user_id,
            content_id=content_id,
        )
        if row is None:
            raise NotFoundError("In-progress Dictation attempt not found")

        total_attempts = await self.repository.get_total_attempt_count(
            user_id=user_id,
            content_id=content_id,
        )

        return self._resume_response(row, total_attempts=total_attempts)

    async def get_attempt_practice(
        self,
        *,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
    ) -> DictationAttemptPracticeResponse:
        row = await self.repository.get_attempt_for_practice(attempt_id)
        if row is None:
            raise NotFoundError("Dictation attempt not found")
        if row.attempt.user_id != user_id:
            raise ForbiddenError()
        if row.attempt.status != AttemptStatus.IN_PROGRESS:
            raise DictationAttemptNotInProgressError()

        total_attempts = await self.repository.get_total_attempt_count(
            user_id=user_id,
            content_id=row.content.id,
        )

        return DictationAttemptPracticeResponse(
            content=self._content_detail(row.content),
            attempt=self._resume_response(row, total_attempts=total_attempts),
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

    async def complete_attempt(
        self,
        *,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
    ) -> DictationCompleteResponse:
        try:
            row = await self.repository.get_attempt_for_update(attempt_id)
            if row is None or row.content.content_type != ContentType.SHADOWING_DICTATION:
                raise NotFoundError("Dictation attempt not found")
            if row.attempt.user_id != user_id:
                raise ForbiddenError()
            if row.attempt.status != AttemptStatus.IN_PROGRESS:
                raise DictationAttemptNotInProgressError()

            transcript_segments = self._transcript_segments(row.content)
            total_count = len(transcript_segments)
            answer_payload = DictationAnswerPayload.model_validate(row.attempt.answer_payload or {})
            results_by_index = {
                result.segment_index: result
                for result in answer_payload.segments
                if 0 <= result.segment_index < total_count
            }
            correct_count = sum(result.is_correct for result in results_by_index.values())
            score = calculate_dictation_score(
                correct_count=correct_count,
                total_count=total_count,
            )
            completed_at = utc_now()
            await self.repository.complete_attempt(
                row.attempt,
                score=score,
                correct_count=correct_count,
                total_count=total_count,
                completed_at=completed_at,
            )

            answered_count = sum(
                bool(result.user_answer.strip()) for result in results_by_index.values()
            )
            earned_exp = calculate_dictation_exp(
                answered_count=answered_count,
                total_count=total_count,
            )
            if earned_exp > 0:
                gamification_service = GamificationService(
                    GamificationRepository(self.repository.session)
                )
                award = await gamification_service.award_experience_in_transaction(
                    user_id=user_id,
                    attempt_id=attempt_id,
                    reward_amount=earned_exp,
                )
                if not award.awarded:
                    raise DictationExperienceAlreadyAwardedError()
                earned_exp = award.amount

            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            raise

        return DictationCompleteResponse(
            attempt_id=row.attempt.id,
            status=row.attempt.status,
            score=float(score),
            correct_count=correct_count,
            total_count=total_count,
            earned_exp=earned_exp,
            completed_at=completed_at,
        )

    async def restart_attempt(
        self,
        *,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
    ) -> DictationStartResponse:
        try:
            await self.repository.lock_attempt_order(user_id)
            row = await self.repository.get_attempt_for_update(attempt_id)
            if row is None or row.content.content_type != ContentType.SHADOWING_DICTATION:
                raise NotFoundError("Dictation attempt not found")
            if row.attempt.user_id != user_id:
                raise ForbiddenError()
            if row.attempt.status != AttemptStatus.IN_PROGRESS:
                raise DictationAttemptNotInProgressError()

            content = row.content
            if content.status != ContentStatus.PUBLISHED:
                raise NotFoundError("Dictation content not found")
            if not content.audio_url:
                raise DictationContentUnavailableError()

            transcript_segments = self._transcript_segments(content)

            await self.repository.delete_attempt(row.attempt)

            attempt_number = await self.repository.get_next_attempt_number(
                user_id=user_id,
                content_id=content.id,
            )
            new_attempt = await self.repository.create_attempt(
                user_id=user_id,
                content_id=content.id,
                attempt_number=attempt_number,
            )
            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            raise

        return DictationStartResponse(
            attempt_id=new_attempt.id,
            content_id=content.id,
            attempt_number=new_attempt.attempt_number,
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

    async def delete_attempt(
        self,
        *,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
    ) -> None:
        try:
            await self.repository.lock_attempt_order(user_id)
            row = await self.repository.get_attempt_for_update(attempt_id)
            if row is None or row.content.content_type != ContentType.SHADOWING_DICTATION:
                raise NotFoundError("Dictation attempt not found")
            if row.attempt.user_id != user_id:
                raise ForbiddenError()
            if row.attempt.status != AttemptStatus.IN_PROGRESS:
                raise DictationAttemptNotInProgressError()

            await self.repository.delete_attempt(row.attempt)
            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            raise

    async def get_attempt_review(
        self,
        *,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
    ) -> DictationAttemptReviewResponse:
        row = await self.repository.get_attempt_for_review(attempt_id)
        if row is None or row.content.content_type != ContentType.SHADOWING_DICTATION:
            raise NotFoundError("Dictation attempt not found")
        if row.attempt.user_id != user_id:
            raise ForbiddenError()

        answer_payload = DictationAnswerPayload.model_validate(row.attempt.answer_payload or {})
        transcript_segments = self._transcript_segments(row.content)
        stored_results_by_index = {
            result.segment_index: result for result in answer_payload.segments
        }
        if row.attempt.status == AttemptStatus.COMPLETED:
            details = [
                DictationSegmentReview(
                    segment_index=index,
                    user_answer=(
                        stored_results_by_index[index].user_answer
                        if index in stored_results_by_index
                        else ""
                    ),
                    correct_script=(
                        stored_results_by_index[index].correct_script
                        if index in stored_results_by_index
                        else segment.script
                    ),
                    is_correct=(
                        stored_results_by_index[index].is_correct
                        if index in stored_results_by_index
                        else False
                    ),
                )
                for index, segment in enumerate(transcript_segments)
            ]
        else:
            details = [
                DictationSegmentReview(
                    segment_index=result.segment_index,
                    user_answer=result.user_answer,
                    correct_script=result.correct_script,
                    is_correct=result.is_correct,
                )
                for result in sorted(
                    answer_payload.segments,
                    key=lambda result: result.segment_index,
                )
            ]
        return DictationAttemptReviewResponse(
            attempt_id=row.attempt.id,
            content=self._content_detail(row.content),
            attempt_number=row.attempt.attempt_number,
            status=row.attempt.status,
            score=float(row.attempt.score) if row.attempt.score is not None else None,
            correct_count=(
                row.attempt.correct_count
                if row.attempt.correct_count is not None
                else sum(result.is_correct for result in stored_results_by_index.values())
            ),
            total_count=len(transcript_segments),
            earned_exp=row.earned_exp or 0,
            completed_at=row.attempt.completed_at,
            segments=[
                DictationSegmentItem(
                    segment_index=index,
                    start_time_ms=segment.start_time_ms,
                    end_time_ms=segment.end_time_ms,
                )
                for index, segment in enumerate(transcript_segments)
            ],
            details=details,
        )

    def _resume_response(
        self,
        row: DictationAttemptRow,
        *,
        total_attempts: int = 0,
    ) -> DictationResumeResponse:
        transcript_segments = self._transcript_segments(row.content)
        if not row.content.audio_url:
            raise DictationContentUnavailableError()

        answer_payload = DictationAnswerPayload.model_validate(row.attempt.answer_payload or {})
        return DictationResumeResponse(
            attempt_id=row.attempt.id,
            content_id=row.content.id,
            attempt_number=row.attempt.attempt_number,
            audio_url=row.content.audio_url,
            total_segments=len(transcript_segments),
            segments=[
                DictationSegmentItem(
                    segment_index=index,
                    start_time_ms=segment.start_time_ms,
                    end_time_ms=segment.end_time_ms,
                )
                for index, segment in enumerate(transcript_segments)
            ],
            checked_segments=sorted(
                answer_payload.segments,
                key=lambda result: result.segment_index,
            ),
            total_attempts=total_attempts,
        )

    def _content_detail(self, content: LearningContent) -> DictationContentDetail:
        transcript_segments = self._transcript_segments(content)
        return DictationContentDetail(
            id=content.id,
            title=content.title,
            description=content.short_description,
            content_type=content.content_type,
            difficulty=content.difficulty,
            topic=content.topic,
            duration_seconds=(
                content.audio_duration_ms / 1000 if content.audio_duration_ms is not None else None
            ),
            audio_url=content.audio_url,
            published_at=content.published_at,
            prompts=[
                DictationPromptSegment(
                    blank_index=index,
                    start_time_ms=segment.start_time_ms,
                    end_time_ms=segment.end_time_ms,
                    prompt=f"___ ({index})",
                )
                for index, segment in enumerate(transcript_segments, start=1)
            ],
        )

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
