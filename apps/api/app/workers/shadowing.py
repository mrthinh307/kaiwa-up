"""Run with python -m app.workers.shadowing; committed jobs survive this process."""

import asyncio
import contextlib
import logging
import random
import signal
import uuid
from collections import Counter
from collections.abc import Sequence

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.exceptions import StorageUnavailableError
from app.exceptions.ai import (
    AiProviderAuthError,
    AiProviderUnavailableError,
    AiRateLimitError,
    AiTimeoutError,
)
from app.integrations.ai.base import AiGateway
from app.integrations.ai.shadowing_contracts import (
    ShadowingEvaluationInput,
    ShadowingSummaryInput,
    validate_shadowing_evaluation,
    validate_shadowing_summary,
)
from app.models.attempt import Recording
from app.models.enums import AiEvaluationStatus, AttemptStatus, RecordingKind
from app.models.shadowing import ShadowingAttemptSegment, ShadowingJob
from app.repositories.recording import RecordingRepository
from app.repositories.shadowing_review import ShadowingReviewRepository
from app.repositories.shadowing_worker import (
    SHADOWING_WORKER_HEARTBEAT_INTERVAL_SECONDS,
    ShadowingWorkerRepository,
)
from app.services.shadowing_comparison import compare_shadowing_segment
from app.services.shadowing_evaluation import (
    ShadowingEvaluationService,
    shadowing_provider_available,
)
from app.services.storage import StorageService
from app.utils.datetime_utils import utc_now

logger = logging.getLogger(__name__)


class _RecordingUnavailable(Exception):
    pass


class ShadowingWorker:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        gateway: AiGateway,
        storage: StorageService,
        settings: Settings,
        *,
        stt_available: bool = True,
        eval_available: bool = True,
    ) -> None:
        if settings.shadowing_job_heartbeat_seconds >= settings.shadowing_job_lease_seconds:
            raise ValueError("The worker heartbeat must be shorter than its lease")
        if settings.shadowing_job_deadline_seconds >= settings.shadowing_job_lease_seconds:
            raise ValueError("The execution deadline must be shorter than the worker lease")
        self.session_factory = session_factory
        self.gateway = gateway
        self.storage = storage
        self.settings = settings
        self.stt_available = stt_available
        self.eval_available = eval_available

    async def recover_expired(self) -> int:
        async with self.session_factory() as session:
            recovered = await ShadowingReviewRepository(session).requeue_expired_jobs()
            await session.commit()
            return recovered

    async def claim(
        self, kinds: Sequence[str], excluded_attempt_ids: Sequence[uuid.UUID] = ()
    ) -> ShadowingJob | None:
        async with self.session_factory() as session:
            job = await ShadowingReviewRepository(session).claim_job(
                kinds=kinds,
                lease_token=uuid.uuid4(),
                lease_seconds=self.settings.shadowing_job_lease_seconds,
                excluded_attempt_ids=excluded_attempt_ids,
            )
            await session.commit()
            return job

    async def run_once(self) -> bool:
        await self.recover_expired()
        job = await self.claim(["transcribe_recording", "evaluate_batch", "summarize_feedback"])
        if job is None:
            return False
        await self.process(job)
        return True

    async def _heartbeat(self, job: ShadowingJob) -> None:
        assert job.lease_token is not None
        while True:
            await asyncio.sleep(self.settings.shadowing_job_heartbeat_seconds)
            async with self.session_factory() as session:
                renewed = await ShadowingReviewRepository(session).heartbeat_job(
                    job_id=job.id,
                    lease_token=job.lease_token,
                    lease_seconds=self.settings.shadowing_job_lease_seconds,
                )
                await session.commit()
            if not renewed:
                return

    async def process(self, job: ShadowingJob) -> None:
        execution = asyncio.create_task(self._execute(job))
        heartbeat = asyncio.create_task(self._heartbeat(job))
        try:
            async with asyncio.timeout(self.settings.shadowing_job_deadline_seconds):
                completed, _ = await asyncio.wait(
                    [execution, heartbeat], return_when=asyncio.FIRST_COMPLETED
                )
                if heartbeat in completed:
                    # Lease loss (or a failed renewal) cannot authorize a stale publish.
                    heartbeat.result()
                    return
                result = execution.result()
            await self._publish(job, result)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            await self._record_failure(job, exc)
        finally:
            execution.cancel()
            heartbeat.cancel()
            await asyncio.gather(execution, heartbeat, return_exceptions=True)

    async def _execute(self, job: ShadowingJob) -> dict[str, object]:
        if job.kind == "transcribe_recording":
            return await self._transcribe(job)
        if not self.eval_available:
            raise AiProviderAuthError()
        if job.kind == "evaluate_batch":
            payload = ShadowingEvaluationInput.model_validate(job.payload)
            result = validate_shadowing_evaluation(
                payload, await self.gateway.evaluate_shadowing_batch(payload=payload)
            )
            return result.model_dump(mode="json")
        if job.kind == "summarize_feedback":
            summary_input = ShadowingSummaryInput.model_validate(job.payload)
            summary = validate_shadowing_summary(
                summary_input,
                await self.gateway.summarize_shadowing_feedback(payload=summary_input),
            )
            return summary.model_dump(mode="json")
        raise ValueError("Unknown Shadowing job kind")

    async def _transcribe(self, job: ShadowingJob) -> dict[str, object]:
        async with self.session_factory() as session:
            recording = await session.get(Recording, job.recording_id) if job.recording_id else None
            if (
                recording is None
                or recording.attempt_id != job.attempt_id
                or recording.kind != RecordingKind.SHADOWING
                or (recording.expired_at is not None and recording.expired_at <= utc_now())
            ):
                raise _RecordingUnavailable()
            segments = await ShadowingReviewRepository(session).get_segments(job.attempt_id)
            if job.payload.get("mode") == "continuous":
                reference = " ".join(segment.script for segment in segments)
            else:
                segment = next(
                    (segment for segment in segments if segment.recording_id == recording.id), None
                )
                if segment is None:
                    raise _RecordingUnavailable()
                reference = segment.script
            transcript = recording.transcription_ja
            storage_key = recording.storage_key
            mime_type = recording.mime_type
        if transcript is None:
            if not self.stt_available:
                raise AiProviderAuthError()
            try:
                audio = await self.storage.get_audio_bytes(storage_key)
            except (FileNotFoundError, KeyError) as exc:
                raise _RecordingUnavailable() from exc
            extension = {
                "audio/wav": "wav",
                "audio/mp4": "mp4",
                "audio/mpeg": "mp3",
                "audio/ogg": "ogg",
            }.get(mime_type or "", "webm")
            recognized = await self.gateway.transcribe(
                audio=audio,
                filename=f"{job.recording_id}.{extension}",
                language="ja",
                prompt_hint=None,
            )
            transcript = recognized.text
        if len(reference) > 20000 or len(transcript) > 20000:
            return {
                "transcription_status": "not_evaluable",
                "transcript": transcript,
                "error_code": "shadowing_transcript_too_long",
                "comparison": None,
            }
        comparison = await asyncio.to_thread(compare_shadowing_segment, reference, transcript)
        state = "completed" if transcript.strip() else "no_speech"
        if comparison.score is None:
            state = "not_evaluable"
        return {
            "transcription_status": state,
            "transcript": transcript,
            "comparison": comparison.model_dump(mode="json"),
        }

    async def _publish(self, job: ShadowingJob, result: dict[str, object]) -> None:
        assert job.lease_token is not None
        async with self.session_factory() as session:
            # Always lock attempt before job for publication/retry. External I/O has finished.
            row = await RecordingRepository(session).get_attempt_for_update(job.attempt_id)
            if row is None or row[0].status != AttemptStatus.COMPLETED:
                return
            if not await ShadowingReviewRepository(session).finish_job(
                job_id=job.id, lease_token=job.lease_token, result=result
            ):
                return
            if job.kind != "transcribe_recording":
                await ShadowingEvaluationService(
                    ShadowingReviewRepository(session), self.settings
                ).publish_job_result(job, result)
                row[0].review_revision += 1
                await session.commit()
                return
            recording = await session.get(Recording, job.recording_id) if job.recording_id else None
            if recording is not None:
                recording.transcription_ja = str(result["transcript"])
            segment = await session.scalar(
                select(ShadowingAttemptSegment).where(
                    ShadowingAttemptSegment.attempt_id == job.attempt_id,
                    ShadowingAttemptSegment.recording_id == job.recording_id,
                )
            )
            if segment is not None:
                segment.transcription_status = str(result["transcription_status"])
                segment.transcript = str(result["transcript"])
                comparison = result.get("comparison")
                segment.comparison = comparison if isinstance(comparison, dict) else None
                error = result.get("error_code")
                segment.error_code = str(error) if error else None
            row[0].review_revision += 1
            payload = dict(row[0].answer_payload or {})
            previous = payload.get("transcription_revision", 0)
            payload["transcription_revision"] = (previous if isinstance(previous, int) else 0) + 1
            row[0].answer_payload = payload
            await session.commit()

    async def _record_failure(self, job: ShadowingJob, exc: Exception) -> None:
        assert job.lease_token is not None
        if isinstance(exc, AiProviderUnavailableError) and isinstance(exc.__cause__, Exception):
            exc = exc.__cause__
        retryable = isinstance(
            exc,
            (
                AiTimeoutError,
                AiRateLimitError,
                AiProviderUnavailableError,
                TimeoutError,
                httpx.TransportError,
                StorageUnavailableError,
            ),
        )
        code = "shadowing_stt_failed"
        if isinstance(exc, _RecordingUnavailable):
            code = "shadowing_recording_unavailable"
        elif isinstance(exc, AiProviderAuthError):
            code = "shadowing_stt_unavailable"
        elif isinstance(exc, (AiTimeoutError, TimeoutError)):
            code = "shadowing_stt_timeout"
        elif isinstance(exc, AiRateLimitError):
            code = "shadowing_stt_rate_limited"
        elif isinstance(exc, (httpx.TransportError, StorageUnavailableError)):
            code = "shadowing_storage_unavailable"
        delay = (5 if job.attempt_count <= 1 else 20) + random.uniform(0, 1) if retryable else None
        if isinstance(exc, AiRateLimitError) and isinstance(exc.details, dict):
            retry_after = exc.details.get("retry_after_seconds")
            if isinstance(retry_after, (int, float)) and retry_after >= 0:
                delay = max(delay or 0, retry_after)
        if job.kind != "transcribe_recording":
            code = code.replace("shadowing_stt_", "shadowing_ai_")
        async with self.session_factory() as session:
            row = await RecordingRepository(session).get_attempt_for_update(job.attempt_id)
            if row is None:
                return
            state = await ShadowingReviewRepository(session).fail_job(
                job_id=job.id,
                lease_token=job.lease_token,
                error_code=code,
                retry_delay_seconds=delay,
            )
            if state is None:
                return
            if job.kind != "transcribe_recording":
                if state == "failed" and job.evaluation_id is not None:
                    evaluation = await ShadowingReviewRepository(session).get_evaluation(
                        attempt_id=job.attempt_id, evaluation_id=job.evaluation_id
                    )
                    if evaluation is not None:
                        evaluation.status = AiEvaluationStatus.FAILED
                        evaluation.error_message = code
                        evaluation.completed_at = utc_now()
                row[0].review_revision += 1
                await session.commit()
                logger.warning("Shadowing job %s: %s (%s)", job.id, code, state)
                return
            segment = await session.scalar(
                select(ShadowingAttemptSegment).where(
                    ShadowingAttemptSegment.attempt_id == job.attempt_id,
                    ShadowingAttemptSegment.recording_id == job.recording_id,
                )
            )
            if segment is not None:
                segment.transcription_status = (
                    "queued"
                    if state == "queued"
                    else (
                        "unavailable"
                        if code in {"shadowing_recording_unavailable", "shadowing_stt_unavailable"}
                        else "failed"
                    )
                )
                segment.error_code = code
                segment.comparison = None
            row[0].review_revision += 1
            payload = dict(row[0].answer_payload or {})
            previous = payload.get("transcription_revision", 0)
            payload["transcription_revision"] = (previous if isinstance(previous, int) else 0) + 1
            row[0].answer_payload = payload
            await session.commit()
        logger.warning("Shadowing job %s: %s (%s)", job.id, code, state)

    async def run(self, stop: asyncio.Event) -> None:
        active: dict[asyncio.Task[None], ShadowingJob] = {}
        worker_id = uuid.uuid4()
        last_heartbeat = float("-inf")
        loop = asyncio.get_running_loop()
        try:
            while not stop.is_set():
                if loop.time() - last_heartbeat >= SHADOWING_WORKER_HEARTBEAT_INTERVAL_SECONDS:
                    async with self.session_factory() as session:
                        await ShadowingWorkerRepository(session).heartbeat(worker_id)
                        await session.commit()
                    last_heartbeat = loop.time()
                for task in list(active):
                    if task.done():
                        del active[task]
                        with contextlib.suppress(asyncio.CancelledError):
                            task.result()
                await self.recover_expired()
                counts = Counter(
                    job.attempt_id for job in active.values() if job.kind == "transcribe_recording"
                )
                while (
                    len(active)
                    < self.settings.shadowing_stt_concurrency
                    + self.settings.shadowing_ai_concurrency
                    and not stop.is_set()
                ):
                    stt_count = sum(job.kind == "transcribe_recording" for job in active.values())
                    kinds: list[str] = []
                    if stt_count < self.settings.shadowing_stt_concurrency:
                        kinds.append("transcribe_recording")
                    if len(active) - stt_count < self.settings.shadowing_ai_concurrency:
                        kinds.extend(["evaluate_batch", "summarize_feedback"])
                    excluded = [
                        attempt
                        for attempt, count in counts.items()
                        if count >= self.settings.shadowing_attempt_stt_concurrency
                    ]
                    job = await self.claim(kinds, excluded)
                    if job is None:
                        break
                    active[asyncio.create_task(self.process(job))] = job
                    if job.kind == "transcribe_recording":
                        counts[job.attempt_id] += 1
                with contextlib.suppress(TimeoutError):
                    await asyncio.wait_for(stop.wait(), timeout=0.5)
        finally:
            # Drain on graceful shutdown; forced termination leaves leases reclaimable.
            await asyncio.gather(*active, return_exceptions=True)
            async with self.session_factory() as session:
                await ShadowingWorkerRepository(session).forget(worker_id)
                await session.commit()


async def _main() -> None:
    from app.core import settings
    from app.core.database import async_session_factory, engine
    from app.integrations.ai import build_ai_gateway

    worker_settings = settings.model_copy(
        update={
            "ai_max_retries": 0,
            "ai_max_output_tokens": settings.shadowing_ai_output_tokens,
        }
    )
    # Production workers never attempt a configured fake fallback.
    if settings.environment in {"production", "staging"}:
        for lane in ("stt", "eval"):
            if getattr(worker_settings, f"ai_{lane}_provider") == "fake":
                setattr(worker_settings, f"ai_{lane}_provider", "")
            fallbacks = getattr(worker_settings, f"ai_{lane}_fallback_providers")
            setattr(
                worker_settings,
                f"ai_{lane}_fallback_providers",
                ",".join(
                    provider.strip()
                    for provider in fallbacks.split(",")
                    if provider.strip() != "fake"
                ),
            )
    providers = [
        worker_settings.ai_stt_provider,
        *worker_settings.ai_stt_fallback_providers.split(","),
    ]
    stt_available = settings.environment not in {"production", "staging"} or any(
        provider.strip() in {"openai", "groq"}
        and getattr(worker_settings, f"ai_{provider.strip()}_api_key", None)
        for provider in providers
    )
    gateway = build_ai_gateway(worker_settings)
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, stop.set)
    try:
        await ShadowingWorker(
            async_session_factory,
            gateway,
            StorageService(),
            worker_settings,
            stt_available=bool(stt_available),
            eval_available=shadowing_provider_available(worker_settings, "eval"),
        ).run(stop)
    finally:
        await gateway.aclose()
        await engine.dispose()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_main())
