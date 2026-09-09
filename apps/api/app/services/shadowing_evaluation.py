"""Opt-in AI review lifecycle; external inference is executed only by the worker."""

import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.core import settings as app_settings
from app.core.config import Settings
from app.exceptions import ForbiddenError
from app.exceptions.shadowing import (
    ShadowingAiInputTooLongError,
    ShadowingAiUnavailableError,
    ShadowingAttemptNotCompletedError,
    ShadowingAttemptNotFoundError,
    ShadowingNoEvaluableSpeechError,
    ShadowingPartialReviewRequiredError,
    ShadowingReviewChangedError,
    ShadowingReviewRateLimitError,
    ShadowingTranscriptionPendingError,
)
from app.integrations.ai.prompts.shadowing import (
    build_shadowing_summary_prompt,
    shadowing_prompt_fits,
)
from app.integrations.ai.shadowing_contracts import (
    ShadowingEvaluationCoverage,
    ShadowingEvaluationResult,
    ShadowingEvaluationSegment,
    ShadowingIndexedCorrection,
    ShadowingSegmentScore,
    ShadowingSummaryInput,
    ShadowingSummaryResult,
    validate_shadowing_summary,
)
from app.models.attempt import AiEvaluation, ExerciseAttempt
from app.models.enums import AiEvaluationStatus, AttemptStatus
from app.models.shadowing import ShadowingJob
from app.repositories.recording import RecordingRepository
from app.repositories.shadowing_review import ShadowingReviewRepository
from app.repositories.shadowing_worker import ShadowingWorkerRepository
from app.schemas.shadowing import (
    ShadowingAiFeedback,
    ShadowingAiReviewResponse,
    ShadowingAiReviewState,
)
from app.services.shadowing_feedback import (
    SHADOWING_PROMPT_VERSION,
    build_shadowing_batches,
    weighted_shadowing_score,
)
from app.utils.datetime_utils import utc_now


class _ReviewInput(BaseModel):
    mode: Literal["segmented", "continuous"]
    coverage: ShadowingEvaluationCoverage
    segments: list[ShadowingEvaluationSegment]
    reference_lengths: dict[int, int]
    recording_ids: dict[int, str]
    zero_scores: list[ShadowingSegmentScore]
    source_transcription_revision: int = 0
    prompt_version: int = SHADOWING_PROMPT_VERSION
    comparison_version: int = 2
    is_partial: bool = False
    batch_count: int = 0
    retry_times: list[datetime] = Field(default_factory=list)


def shadowing_provider_available(settings: Settings, lane: Literal["stt", "eval"]) -> bool:
    if settings.environment not in {"production", "staging"}:
        return True
    names = [
        getattr(settings, f"ai_{lane}_provider"),
        *getattr(settings, f"ai_{lane}_fallback_providers").split(","),
    ]
    return any(
        name.strip() in {"openai", "groq"} and getattr(settings, f"ai_{name.strip()}_api_key", None)
        for name in names
    )


class ShadowingEvaluationService:
    def __init__(
        self, repository: ShadowingReviewRepository, settings: Settings | None = None
    ) -> None:
        self.repository = repository
        self.settings = settings or app_settings

    async def _input(self, attempt: ExerciseAttempt) -> _ReviewInput:
        from app.services.shadowing_review import ShadowingReviewService

        review = await ShadowingReviewService(self.repository).get_attempt_review(
            user_id=attempt.user_id, attempt_id=attempt.id
        )
        if (
            review.transcription.queued
            or review.transcription.processing
            or review.transcription.not_requested
        ):
            raise ShadowingTranscriptionPendingError()
        coverage = ShadowingEvaluationCoverage.model_validate(review.transcription.model_dump())
        rows = await self.repository.get_segments(attempt.id)
        inputs: list[ShadowingEvaluationSegment] = []
        lengths: dict[int, int] = {}
        recordings: dict[int, str] = {}
        zero_scores: list[ShadowingSegmentScore] = []
        if review.mode.value == "continuous":
            jobs = await self.repository.get_jobs(attempt.id)
            stt = next((job for job in reversed(jobs) if job.kind == "transcribe_recording"), None)
            comparison = stt.result.get("comparison") if stt and stt.result else None
            length = comparison.get("reference_length") if isinstance(comparison, dict) else None
            if (
                stt
                and stt.recording_id
                and isinstance(length, int)
                and length > 0
                and review.user_continuous_transcript
            ):
                recordings[0] = str(stt.recording_id)
                lengths[0] = length
                inputs.append(
                    ShadowingEvaluationSegment(
                        segment_index=0,
                        reference=" ".join(row.script for row in rows),
                        learner=review.user_continuous_transcript,
                        reference_length=length,
                    )
                )
        else:
            for row in rows:
                if row.recording_id is not None:
                    recordings[row.segment_index] = str(row.recording_id)
                length = row.comparison.get("reference_length") if row.comparison else None
                if not isinstance(length, int) or length <= 0:
                    continue
                if row.transcription_status == "completed" and row.transcript:
                    lengths[row.segment_index] = length
                    inputs.append(
                        ShadowingEvaluationSegment(
                            segment_index=row.segment_index,
                            reference=row.script,
                            learner=row.transcript,
                            reference_length=length,
                        )
                    )
                elif row.transcription_status == "no_speech":
                    lengths[row.segment_index] = length
                    zero_scores.append(
                        ShadowingSegmentScore(segment_index=row.segment_index, score=0)
                    )
        if not inputs:
            raise ShadowingNoEvaluableSpeechError()
        source_revision = (attempt.answer_payload or {}).get("transcription_revision", 0)
        return _ReviewInput(
            mode="continuous" if review.mode.value == "continuous" else "segmented",
            coverage=coverage,
            segments=inputs,
            reference_lengths=lengths,
            recording_ids=recordings,
            zero_scores=zero_scores,
            source_transcription_revision=source_revision
            if isinstance(source_revision, int)
            else 0,
            is_partial=coverage.completed + coverage.no_speech < coverage.total,
        )

    async def request_review(
        self,
        *,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
        review_revision: int,
        allow_partial: bool = False,
    ) -> ShadowingAiReviewResponse:
        from app.services.shadowing_review import shadowing_input_fingerprint

        queued_jobs = 0
        try:
            row = await RecordingRepository(self.repository.session).get_attempt_for_update(
                attempt_id
            )
            if row is None:
                raise ShadowingAttemptNotFoundError()
            attempt = row[0]
            if attempt.user_id != user_id:
                raise ForbiddenError()
            if attempt.status != AttemptStatus.COMPLETED:
                raise ShadowingAttemptNotCompletedError()
            if (attempt.answer_payload or {}).get("schema_version") != 2:
                raise ShadowingTranscriptionPendingError(details={"requires_transcription": True})
            source = await self._input(attempt)
            fingerprint = shadowing_input_fingerprint(
                source.model_dump(
                    mode="json",
                    exclude={
                        "source_transcription_revision",
                        "retry_times",
                        "batch_count",
                    },
                )
            )
            existing = await self.repository.find_evaluation(
                attempt_id=attempt.id, fingerprint=fingerprint
            )
            payload = dict(attempt.answer_payload or {})
            if existing is not None and existing.status != AiEvaluationStatus.FAILED:
                details = dict(existing.details or {})
                changes_active = (
                    payload.get("active_ai_review_id") != str(existing.id)
                    or details.get("source_transcription_revision", 0)
                    != source.source_transcription_revision
                )
                if changes_active and attempt.review_revision != review_revision:
                    raise ShadowingReviewChangedError()
                details["source_transcription_revision"] = source.source_transcription_revision
                existing.details = details
                payload["active_ai_review_id"] = str(existing.id)
                attempt.answer_payload = payload
                if changes_active:
                    attempt.review_revision += 1
                await self.repository.session.commit()
                state, feedback = await self.read_feedback(attempt)
                return ShadowingAiReviewResponse(
                    attempt_id=attempt.id,
                    queued_jobs=0,
                    review_revision=attempt.review_revision,
                    ai_review=state,
                    ai_feedback=feedback,
                )
            if attempt.review_revision != review_revision:
                raise ShadowingReviewChangedError()
            if (
                source.coverage.failed
                or source.coverage.unavailable
                or source.coverage.not_evaluable
            ) and not allow_partial:
                raise ShadowingPartialReviewRequiredError()
            if not shadowing_provider_available(self.settings, "eval"):
                raise ShadowingAiUnavailableError()
            now = utc_now()
            if existing is not None:
                previous = _ReviewInput.model_validate(existing.details)
                recent = [
                    stamp for stamp in previous.retry_times if stamp > now - timedelta(days=1)
                ]
                if len(recent) >= 3:
                    raise ShadowingReviewRateLimitError(details={"retry_after_seconds": 86400})
                details = dict(existing.details or {})
                details["source_transcription_revision"] = source.source_transcription_revision
                details["retry_times"] = [stamp.isoformat() for stamp in [*recent, now]]
                existing.details = details
                existing.status = AiEvaluationStatus.PENDING
                existing.error_message = None
                existing.completed_at = None
                for job in await self.repository.get_jobs(attempt.id):
                    if job.evaluation_id == existing.id and job.status == "failed":
                        job.status = "queued"
                        job.available_at = now
                        job.max_attempts = job.attempt_count + 3
                        job.error_code = None
                        job.completed_at = None
                        queued_jobs += 1
                evaluation = existing
            else:
                if (
                    await self.repository.count_recent_evaluations(
                        attempt_id=attempt.id, since=now - timedelta(days=1)
                    )
                    >= 3
                ):
                    raise ShadowingReviewRateLimitError(details={"retry_after_seconds": 86400})
                batches = build_shadowing_batches(
                    source.segments,
                    coverage=source.coverage,
                    mode=source.mode,
                    context_tokens=self.settings.shadowing_ai_context_tokens,
                    output_tokens=self.settings.shadowing_ai_output_tokens,
                )
                source.batch_count = len(batches)
                evaluation = await self.repository.create_evaluation(
                    attempt_id=attempt.id,
                    fingerprint=fingerprint,
                    details=source.model_dump(mode="json"),
                )
                await self.repository.enqueue_jobs(
                    [
                        {
                            "attempt_id": attempt.id,
                            "kind": "evaluate_batch",
                            "evaluation_id": evaluation.id,
                            "input_fingerprint": fingerprint,
                            "batch_index": index,
                            "payload": batch.model_dump(mode="json"),
                        }
                        for index, batch in enumerate(batches)
                    ]
                )
                queued_jobs = len(batches)
            payload["active_ai_review_id"] = str(evaluation.id)
            attempt.answer_payload = payload
            attempt.review_revision += 1
            await self.repository.session.commit()
            state, feedback = await self.read_feedback(attempt)
            return ShadowingAiReviewResponse(
                attempt_id=attempt.id,
                queued_jobs=queued_jobs,
                review_revision=attempt.review_revision,
                ai_review=state,
                ai_feedback=feedback,
            )
        except Exception:
            await self.repository.session.rollback()
            raise

    async def read_feedback(
        self, attempt: ExerciseAttempt
    ) -> tuple[ShadowingAiReviewState, ShadowingAiFeedback | None]:
        payload = attempt.answer_payload or {}
        active_id = payload.get("active_ai_review_id")
        active: AiEvaluation | None = None
        if isinstance(active_id, str):
            active = await self.repository.get_evaluation(
                attempt_id=attempt.id, evaluation_id=uuid.UUID(active_id)
            )
        displayed = (
            active
            if active and active.status == AiEvaluationStatus.COMPLETED
            else await self.repository.latest_completed_evaluation(attempt.id)
        )
        if active is None and displayed is None:
            return ShadowingAiReviewState(), None
        active = active or displayed
        assert active is not None
        jobs = [
            job
            for job in await self.repository.get_jobs(attempt.id)
            if job.evaluation_id == active.id
        ]
        details = active.details or {}
        lengths = details.get("reference_lengths")
        total_batches = details.get("batch_count", 0)
        state = ShadowingAiReviewState(
            review_id=active.id,
            status="completed"
            if active.status == AiEvaluationStatus.COMPLETED
            else "failed"
            if active.status == AiEvaluationStatus.FAILED
            or any(job.status == "failed" for job in jobs)
            else "processing"
            if any(job.status == "processing" for job in jobs)
            else "queued",
            error_code=active.error_message,
            is_partial=bool(details.get("is_partial", False)),
            evaluated_segments=len(lengths) if isinstance(lengths, dict) else 0,
            completed_batches=sum(
                job.kind == "evaluate_batch" and job.status == "completed" for job in jobs
            ),
            total_batches=total_batches if isinstance(total_batches, int) else 0,
        )
        feedback: ShadowingAiFeedback | None = None
        if state.status in {"queued", "processing"}:
            state.is_delayed = not await ShadowingWorkerRepository(
                self.repository.session
            ).is_online()
        if displayed is not None:
            saved = displayed.details or {}
            state.feedback_review_id = displayed.id
            state.is_stale = displayed.id != active.id or (
                displayed.review_fingerprint is not None
                and saved.get("source_transcription_revision", 0)
                != payload.get("transcription_revision", 0)
            )
            feedback = ShadowingAiFeedback.model_validate(
                {
                    "similarity_score": float(displayed.similarity_score)
                    if displayed.similarity_score is not None
                    else None,
                    "feedback": displayed.feedback,
                    "corrections": saved.get("corrections", []),
                    "hints": saved.get("hints", []),
                    "coverage": saved.get("coverage", {}),
                    "provider": displayed.provider,
                    "model": displayed.model,
                    "prompt_version": saved.get("prompt_version"),
                }
            )
        return state, feedback

    async def publish_job_result(self, job: ShadowingJob, result: dict[str, object]) -> None:
        if job.evaluation_id is None:
            raise ValueError("Evaluation job has no review")
        evaluation = await self.repository.get_evaluation(
            attempt_id=job.attempt_id, evaluation_id=job.evaluation_id
        )
        if evaluation is None:
            raise ValueError("Evaluation job has no persisted review")
        source = _ReviewInput.model_validate(evaluation.details)
        jobs = [
            item
            for item in await self.repository.get_jobs(job.attempt_id)
            if item.evaluation_id == evaluation.id
        ]
        batches = [item for item in jobs if item.kind == "evaluate_batch"]
        if any(item.status != "completed" for item in batches):
            return
        results = [ShadowingEvaluationResult.model_validate(item.result) for item in batches]
        scores = [score for batch in results for score in batch.segments] + source.zero_scores
        overall_score = weighted_shadowing_score(scores, source.reference_lengths)
        if job.kind == "summarize_feedback":
            summary_input = ShadowingSummaryInput.model_validate(job.payload)
            summary = validate_shadowing_summary(
                summary_input, ShadowingSummaryResult.model_validate(result)
            )
            corrections = [summary_input.corrections[index] for index in summary.correction_indices]
            self._complete(
                evaluation,
                overall_score,
                summary.feedback,
                corrections,
                summary.hints,
                summary.provider,
                summary.model,
            )
        elif source.batch_count == 1:
            batch = results[0]
            self._complete(
                evaluation,
                overall_score,
                batch.feedback,
                batch.corrections,
                batch.hints,
                batch.provider,
                batch.model,
            )
        else:
            score_by_id = {item.segment_index: item.score for item in scores}
            corrections = sorted(
                [correction for batch in results for correction in batch.corrections],
                key=lambda correction: (
                    score_by_id[correction.segment_index],
                    correction.segment_index,
                ),
            )[:10]
            summary_input = ShadowingSummaryInput(
                mode=source.mode,
                overall_score=overall_score,
                evaluated_segments=len(scores),
                coverage=source.coverage,
                corrections=corrections,
                score_distribution={
                    "matching": sum(item.score >= 80 for item in scores),
                    "needs_review": sum(item.score < 80 for item in scores),
                },
            )
            while not shadowing_prompt_fits(
                build_shadowing_summary_prompt(summary_input),
                context_tokens=self.settings.shadowing_ai_context_tokens,
                output_tokens=self.settings.shadowing_ai_output_tokens,
            ):
                if not summary_input.corrections:
                    raise ShadowingAiInputTooLongError()
                summary_input.corrections.pop()
            await self.repository.enqueue_job(
                attempt_id=job.attempt_id,
                kind="summarize_feedback",
                fingerprint=job.input_fingerprint,
                payload=summary_input.model_dump(mode="json"),
                evaluation_id=evaluation.id,
            )

    @staticmethod
    def _complete(
        evaluation: AiEvaluation,
        score: float | None,
        feedback: str,
        corrections: list[ShadowingIndexedCorrection],
        hints: list[str],
        provider: str | None,
        model: str | None,
    ) -> None:
        evaluation.status = AiEvaluationStatus.COMPLETED
        evaluation.completed_at = utc_now()
        evaluation.similarity_score = Decimal(str(score)) if score is not None else None
        evaluation.feedback = feedback
        evaluation.provider = provider
        evaluation.model = model
        evaluation.error_message = None
        evaluation.details = {
            **(evaluation.details or {}),
            "corrections": [item.model_dump(mode="json") for item in corrections],
            "hints": hints,
        }
