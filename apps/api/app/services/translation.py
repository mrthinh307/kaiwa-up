"""Business logic for Listening & Translation."""

import logging
import math
import uuid
from dataclasses import dataclass

from app.exceptions import (
    NotFoundError,
    TranslationContentUnavailableError,
    TranslationEvaluationInProgressError,
)
from app.integrations.ai import AiGateway
from app.integrations.ai.contracts import EvaluationResult
from app.models.content import LearningContent
from app.models.enums import AiEvaluationStatus, AttemptStatus, JlptLevel
from app.repositories.gamification import GamificationRepository
from app.repositories.translation import TranslationRepository, TranslationResultRow
from app.schemas.pagination import PaginatedResponse
from app.schemas.translation import (
    TranslationEvaluationDetails,
    TranslationLessonDetail,
    TranslationLessonItem,
    TranslationSubmissionResponse,
)
from app.services.gamification import GamificationService
from app.utils.datetime_utils import utc_now

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PendingTranslationSubmission:
    attempt_id: uuid.UUID
    evaluation_id: uuid.UUID


class TranslationService:
    def __init__(self, repository: TranslationRepository, ai_gateway: AiGateway) -> None:
        self.repository = repository
        self.ai_gateway = ai_gateway

    async def list_lessons(
        self,
        *,
        user_id: uuid.UUID,
        difficulty: JlptLevel | None,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[TranslationLessonItem]:
        rows, total = await self.repository.list_published_lessons(
            user_id=user_id,
            difficulty=difficulty,
            limit=page_size,
            offset=(page - 1) * page_size,
        )
        return PaginatedResponse[TranslationLessonItem](
            items=[self._lesson_item(content, is_completed) for content, is_completed in rows],
            total_items=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    async def get_lesson(
        self, *, user_id: uuid.UUID, content_id: uuid.UUID
    ) -> TranslationLessonDetail:
        content = await self._get_lesson(content_id)
        item = self._lesson_item(
            content,
            await self.repository.is_completed(user_id=user_id, content_id=content_id),
        )
        return TranslationLessonDetail(**item.model_dump())

    async def submit_translation(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        translation_vi: str,
    ) -> TranslationSubmissionResponse:
        content = await self._get_lesson(content_id)
        source_text = self._source_text(content)
        reference_translation = self._reference_translation(content)
        prepared = await self._prepare_submission(
            user_id=user_id,
            content=content,
            translation_vi=translation_vi,
            reference_translation=reference_translation,
        )
        if isinstance(prepared, TranslationSubmissionResponse):
            return prepared

        try:
            result = await self.ai_gateway.evaluate_translation(
                source_text=source_text,
                reference_translation=reference_translation,
                user_translation=translation_vi,
            )
            return await self._complete_submission(
                user_id=user_id,
                content=content,
                pending=prepared,
                result=result,
                reference_translation=reference_translation,
            )
        except Exception as exc:
            await self._record_evaluation_failure(
                user_id=user_id,
                pending=prepared,
                error_code=getattr(exc, "code", "ai_evaluation_failed"),
            )
            raise

    async def _prepare_submission(
        self,
        *,
        user_id: uuid.UUID,
        content: LearningContent,
        translation_vi: str,
        reference_translation: str,
    ) -> PendingTranslationSubmission | TranslationSubmissionResponse:
        try:
            await self.repository.lock_user(user_id)
            completed = await self.repository.get_completed_result(
                user_id=user_id,
                content_id=content.id,
            )
            if completed is not None:
                response = self._stored_response(completed, reference_translation)
                await self.repository.session.commit()
                return response

            attempt = await self.repository.get_latest_in_progress_attempt_for_update(
                user_id=user_id,
                content_id=content.id,
            )
            submitted_at = utc_now()
            if attempt is None:
                attempt = await self.repository.create_attempt(
                    user_id=user_id,
                    content_id=content.id,
                    attempt_number=await self.repository.next_attempt_number(
                        user_id=user_id,
                        content_id=content.id,
                    ),
                    translation_vi=translation_vi,
                    submitted_at=submitted_at,
                )
                evaluation = await self.repository.create_pending_evaluation(attempt.id)
            else:
                existing_evaluation = await self.repository.get_latest_evaluation_for_update(
                    attempt.id
                )
                if (
                    existing_evaluation is not None
                    and existing_evaluation.status == AiEvaluationStatus.PENDING
                ):
                    raise TranslationEvaluationInProgressError()
                await self.repository.update_attempt_translation(
                    attempt,
                    translation_vi=translation_vi,
                    submitted_at=submitted_at,
                )
                if existing_evaluation is None:
                    evaluation = await self.repository.create_pending_evaluation(attempt.id)
                else:
                    await self.repository.reset_evaluation(existing_evaluation)
                    evaluation = existing_evaluation

            await self.repository.session.commit()
            return PendingTranslationSubmission(
                attempt_id=attempt.id,
                evaluation_id=evaluation.id,
            )
        except Exception:
            await self.repository.session.rollback()
            raise

    async def _record_evaluation_failure(
        self,
        *,
        user_id: uuid.UUID,
        pending: PendingTranslationSubmission,
        error_code: str,
    ) -> None:
        try:
            attempt = await self.repository.get_attempt_for_update(
                attempt_id=pending.attempt_id,
                user_id=user_id,
            )
            if attempt is None or attempt.status == AttemptStatus.COMPLETED:
                await self.repository.session.rollback()
                return
            evaluation = await self.repository.get_latest_evaluation_for_update(attempt.id)
            if (
                evaluation is not None
                and evaluation.id == pending.evaluation_id
                and evaluation.status == AiEvaluationStatus.PENDING
            ):
                await self.repository.mark_evaluation_failed(
                    evaluation,
                    error_code=error_code,
                    completed_at=utc_now(),
                )
            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            logger.exception(
                "Could not persist Translation evaluation failure",
                extra={
                    "attempt_id": str(pending.attempt_id),
                    "evaluation_id": str(pending.evaluation_id),
                },
            )

    async def _complete_submission(
        self,
        *,
        user_id: uuid.UUID,
        content: LearningContent,
        pending: PendingTranslationSubmission,
        result: EvaluationResult,
        reference_translation: str,
    ) -> TranslationSubmissionResponse:
        try:
            attempt = await self.repository.get_attempt_for_update(
                attempt_id=pending.attempt_id,
                user_id=user_id,
            )
            if attempt is None or attempt.content_id != content.id:
                raise NotFoundError("Listening Translation attempt not found")
            if attempt.status == AttemptStatus.COMPLETED:
                stored = await self.repository.get_completed_result(
                    user_id=user_id,
                    content_id=content.id,
                )
                if stored is None:
                    raise RuntimeError("Completed Translation attempt has no evaluation")
                response = self._stored_response(stored, reference_translation)
                await self.repository.session.commit()
                return response

            evaluation = await self.repository.get_latest_evaluation_for_update(attempt.id)
            if evaluation is None or evaluation.id != pending.evaluation_id:
                raise RuntimeError("Translation evaluation is missing")

            completed_at = utc_now()
            details = TranslationEvaluationDetails(
                is_acceptable=result.is_acceptable,
                covered_ideas=result.covered_ideas,
                missing_ideas=result.missing_ideas,
                suggestions=result.suggestions or result.hints,
            )
            await self.repository.complete_evaluation(
                evaluation,
                score=result.score,
                feedback=result.feedback,
                details=details.model_dump(),
                completed_at=completed_at,
            )
            await self.repository.complete_attempt(
                attempt,
                score=result.score,
                completed_at=completed_at,
            )
            award = await GamificationService(
                GamificationRepository(self.repository.session)
            ).award_experience_in_transaction(
                user_id=user_id,
                attempt_id=attempt.id,
                reward_amount=content.base_exp,
            )
            await self.repository.sync_completed_content_count(user_id)
            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            raise

        return TranslationSubmissionResponse(
            attempt_id=attempt.id,
            evaluation_id=evaluation.id,
            status=attempt.status,
            exp_earned=award.amount,
            score=result.score,
            feedback=result.feedback,
            reference_translation_vi=reference_translation,
            **details.model_dump(),
        )

    async def _get_lesson(self, content_id: uuid.UUID) -> LearningContent:
        content = await self.repository.get_published_lesson(content_id)
        if content is None:
            raise NotFoundError("Listening Translation lesson not found")
        self._validate_content(content)
        return content

    @staticmethod
    def _validate_content(content: LearningContent) -> None:
        if (
            not content.audio_url
            or not content.transcript_ja
            or content.translation is None
            or not content.translation.reference_translation_vi
        ):
            raise TranslationContentUnavailableError()

    @classmethod
    def _lesson_item(cls, content: LearningContent, is_completed: bool) -> TranslationLessonItem:
        cls._validate_content(content)
        if content.audio_url is None:
            raise TranslationContentUnavailableError()
        return TranslationLessonItem(
            id=content.id,
            title=content.title,
            description=content.short_description,
            difficulty=content.difficulty,
            topic=content.topic,
            duration_seconds=(
                content.audio_duration_ms / 1000 if content.audio_duration_ms is not None else None
            ),
            audio_url=content.audio_url,
            is_completed=is_completed,
        )

    @staticmethod
    def _source_text(content: LearningContent) -> str:
        scripts: list[str] = []
        for segment in content.transcript_ja or []:
            script = segment.get("script")
            if not isinstance(script, str) or not script.strip():
                raise TranslationContentUnavailableError()
            scripts.append(script.strip())
        if not scripts:
            raise TranslationContentUnavailableError()
        return "\n".join(scripts)

    @staticmethod
    def _reference_translation(content: LearningContent) -> str:
        if content.translation is None or not content.translation.reference_translation_vi:
            raise TranslationContentUnavailableError()
        return content.translation.reference_translation_vi

    @staticmethod
    def _stored_response(
        row: TranslationResultRow, reference_translation: str
    ) -> TranslationSubmissionResponse:
        details = TranslationEvaluationDetails.model_validate(row.evaluation.details or {})
        stored_score = row.evaluation.similarity_score or row.attempt.score
        if stored_score is None or row.evaluation.feedback is None:
            raise RuntimeError("Completed Translation result is incomplete")
        return TranslationSubmissionResponse(
            attempt_id=row.attempt.id,
            evaluation_id=row.evaluation.id,
            status=row.attempt.status,
            exp_earned=row.exp_earned or 0,
            score=round(stored_score),
            feedback=row.evaluation.feedback,
            reference_translation_vi=reference_translation,
            **details.model_dump(),
        )
