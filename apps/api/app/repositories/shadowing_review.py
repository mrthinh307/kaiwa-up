"""Snapshot and job persistence. Services/worker entrypoints own every transaction."""

import uuid
from collections.abc import Sequence
from datetime import datetime, timedelta

from sqlalchemy import case, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert

from app.models.attempt import AiEvaluation, ExerciseAttempt
from app.models.enums import AiEvaluationStatus
from app.models.shadowing import ShadowingAttemptSegment, ShadowingJob
from app.repositories.base import BaseRepository
from app.schemas.learning_content import TranscriptSegment


class ShadowingReviewRepository(BaseRepository):
    async def find_evaluation(
        self, *, attempt_id: uuid.UUID, fingerprint: str
    ) -> AiEvaluation | None:
        return (
            await self.session.scalars(
                select(AiEvaluation).where(
                    AiEvaluation.attempt_id == attempt_id,
                    AiEvaluation.review_fingerprint == fingerprint,
                )
            )
        ).one_or_none()

    async def get_evaluation(
        self, *, attempt_id: uuid.UUID, evaluation_id: uuid.UUID
    ) -> AiEvaluation | None:
        return (
            await self.session.scalars(
                select(AiEvaluation).where(
                    AiEvaluation.attempt_id == attempt_id, AiEvaluation.id == evaluation_id
                )
            )
        ).one_or_none()

    async def latest_completed_evaluation(self, attempt_id: uuid.UUID) -> AiEvaluation | None:
        return (
            await self.session.scalars(
                select(AiEvaluation)
                .where(
                    AiEvaluation.attempt_id == attempt_id,
                    AiEvaluation.status == AiEvaluationStatus.COMPLETED,
                )
                .order_by(AiEvaluation.created_at.desc())
                .limit(1)
            )
        ).one_or_none()

    async def count_recent_evaluations(self, *, attempt_id: uuid.UUID, since: datetime) -> int:
        count = await self.session.scalar(
            select(func.count())
            .select_from(AiEvaluation)
            .where(
                AiEvaluation.attempt_id == attempt_id,
                AiEvaluation.review_fingerprint.is_not(None),
                AiEvaluation.created_at >= since,
            )
        )
        return count or 0

    async def create_evaluation(
        self, *, attempt_id: uuid.UUID, fingerprint: str, details: dict[str, object]
    ) -> AiEvaluation:
        evaluation = AiEvaluation(
            attempt_id=attempt_id,
            review_fingerprint=fingerprint,
            status=AiEvaluationStatus.PENDING,
            details=details,
        )
        self.session.add(evaluation)
        await self.session.flush()
        return evaluation

    async def enqueue_jobs(self, jobs: Sequence[dict[str, object]]) -> None:
        """One round trip for a submitted lesson, including hundreds of recordings."""
        if jobs:
            await self.session.execute(
                insert(ShadowingJob)
                .values(list(jobs))
                .on_conflict_do_nothing(constraint="uq_shadowing_job_input")
            )

    async def create_snapshot(
        self, *, attempt_id: uuid.UUID, segments: Sequence[TranscriptSegment]
    ) -> None:
        if not segments:
            return
        existing = await self.session.scalar(
            select(ShadowingAttemptSegment.id)
            .where(ShadowingAttemptSegment.attempt_id == attempt_id)
            .limit(1)
        )
        if existing is not None:
            return
        await self.session.execute(
            insert(ShadowingAttemptSegment)
            .values(
                [
                    {
                        "attempt_id": attempt_id,
                        "segment_index": index,
                        "script": segment.script,
                        "start_time_ms": segment.start_time_ms,
                        "end_time_ms": segment.end_time_ms,
                    }
                    for index, segment in enumerate(segments)
                ]
            )
            .on_conflict_do_nothing(constraint="uq_shadowing_attempt_segment")
        )

    async def get_segments(self, attempt_id: uuid.UUID) -> list[ShadowingAttemptSegment]:
        return list(
            await self.session.scalars(
                select(ShadowingAttemptSegment)
                .where(ShadowingAttemptSegment.attempt_id == attempt_id)
                .order_by(ShadowingAttemptSegment.segment_index)
                .execution_options(populate_existing=True)
            )
        )

    async def enqueue_job(
        self,
        *,
        attempt_id: uuid.UUID,
        kind: str,
        fingerprint: str,
        payload: dict[str, object],
        recording_id: uuid.UUID | None = None,
        evaluation_id: uuid.UUID | None = None,
        batch_index: int = 0,
    ) -> ShadowingJob:
        await self.session.execute(
            insert(ShadowingJob)
            .values(
                attempt_id=attempt_id,
                kind=kind,
                input_fingerprint=fingerprint,
                payload=payload,
                recording_id=recording_id,
                evaluation_id=evaluation_id,
                batch_index=batch_index,
            )
            .on_conflict_do_nothing(constraint="uq_shadowing_job_input")
        )
        return (
            await self.session.scalars(
                select(ShadowingJob).where(
                    ShadowingJob.attempt_id == attempt_id,
                    ShadowingJob.kind == kind,
                    ShadowingJob.input_fingerprint == fingerprint,
                    ShadowingJob.batch_index == batch_index,
                )
            )
        ).one()

    async def claim_job(
        self,
        *,
        kinds: Sequence[str],
        lease_token: uuid.UUID,
        lease_seconds: int,
        excluded_attempt_ids: Sequence[uuid.UUID] = (),
    ) -> ShadowingJob | None:
        statement = (
            select(ShadowingJob, func.clock_timestamp())
            .where(
                ShadowingJob.status == "queued",
                ShadowingJob.kind.in_(kinds),
                ShadowingJob.available_at <= func.clock_timestamp(),
                ShadowingJob.attempt_count < ShadowingJob.max_attempts,
            )
            .order_by(ShadowingJob.available_at, ShadowingJob.created_at, ShadowingJob.id)
            .with_for_update(skip_locked=True)
            .limit(1)
            .execution_options(populate_existing=True)
        )
        if excluded_attempt_ids:
            statement = statement.where(
                or_(
                    ShadowingJob.kind != "transcribe_recording",
                    ShadowingJob.attempt_id.not_in(excluded_attempt_ids),
                )
            )
        row = (await self.session.execute(statement)).first()
        if row is not None:
            job, now = row
            assert isinstance(job, ShadowingJob)
            job.status = "processing"
            job.lease_token = lease_token
            job.locked_until = now + timedelta(seconds=lease_seconds)
            job.heartbeat_at = now
            job.started_at = now
            job.attempt_count += 1
            await self.session.flush()
            return job
        return None

    async def finish_job(
        self, *, job_id: uuid.UUID, lease_token: uuid.UUID, result: dict[str, object]
    ) -> bool:
        now = func.clock_timestamp()
        job_id_updated = await self.session.scalar(
            update(ShadowingJob)
            .where(
                ShadowingJob.id == job_id,
                ShadowingJob.status == "processing",
                ShadowingJob.lease_token == lease_token,
                ShadowingJob.locked_until > now,
            )
            .values(
                status="completed",
                result=result,
                completed_at=now,
                locked_until=None,
                lease_token=None,
                error_code=None,
            )
            .returning(ShadowingJob.id)
        )
        return job_id_updated is not None

    async def heartbeat_job(
        self, *, job_id: uuid.UUID, lease_token: uuid.UUID, lease_seconds: int
    ) -> bool:
        now = func.clock_timestamp()
        job_id_updated = await self.session.scalar(
            update(ShadowingJob)
            .where(
                ShadowingJob.id == job_id,
                ShadowingJob.status == "processing",
                ShadowingJob.lease_token == lease_token,
                ShadowingJob.locked_until > now,
            )
            .values(heartbeat_at=now, locked_until=now + timedelta(seconds=lease_seconds))
            .returning(ShadowingJob.id)
        )
        return job_id_updated is not None

    async def fail_job(
        self,
        *,
        job_id: uuid.UUID,
        lease_token: uuid.UUID,
        error_code: str,
        retry_delay_seconds: float | None,
    ) -> str | None:
        now = func.clock_timestamp()
        can_retry = retry_delay_seconds is not None
        state = (
            case(
                (ShadowingJob.attempt_count < ShadowingJob.max_attempts, "queued"),
                else_="failed",
            )
            if can_retry
            else "failed"
        )
        updated = await self.session.scalar(
            update(ShadowingJob)
            .where(
                ShadowingJob.id == job_id,
                ShadowingJob.status == "processing",
                ShadowingJob.lease_token == lease_token,
                ShadowingJob.locked_until > now,
            )
            .values(
                status=state,
                error_code=error_code,
                available_at=now + timedelta(seconds=retry_delay_seconds or 0),
                lease_token=None,
                locked_until=None,
            )
            .returning(ShadowingJob.status)
        )
        return updated if isinstance(updated, str) else None

    async def get_jobs(self, attempt_id: uuid.UUID) -> list[ShadowingJob]:
        return list(
            await self.session.scalars(
                select(ShadowingJob)
                .where(ShadowingJob.attempt_id == attempt_id)
                .order_by(ShadowingJob.created_at, ShadowingJob.id)
                .execution_options(populate_existing=True)
            )
        )

    async def requeue_expired_jobs(self, *, now: datetime | None = None) -> int:
        current_time = now if now is not None else func.clock_timestamp()
        # Match publication's lock order so recovery cannot deadlock with a finishing job.
        attempts = list(
            await self.session.scalars(
                select(ExerciseAttempt)
                .where(
                    ExerciseAttempt.id.in_(
                        select(ShadowingJob.attempt_id).where(
                            ShadowingJob.status == "processing",
                            ShadowingJob.locked_until <= current_time,
                        )
                    )
                )
                .order_by(ExerciseAttempt.id)
                .with_for_update(skip_locked=True)
            )
        )
        if not attempts:
            return 0
        updated = list(
            await self.session.scalars(
                update(ShadowingJob)
                .where(
                    ShadowingJob.attempt_id.in_([attempt.id for attempt in attempts]),
                    ShadowingJob.status == "processing",
                    ShadowingJob.locked_until <= current_time,
                )
                .values(
                    status=case(
                        (ShadowingJob.attempt_count >= ShadowingJob.max_attempts, "failed"),
                        else_="queued",
                    ),
                    error_code="shadowing_worker_lease_expired",
                    lease_token=None,
                    locked_until=None,
                    available_at=current_time,
                )
                .returning(ShadowingJob)
            )
        )
        for attempt in attempts:
            recovered = [job for job in updated if job.attempt_id == attempt.id]
            if not recovered:
                continue
            attempt.review_revision += 1
            if any(job.kind == "transcribe_recording" for job in recovered):
                payload = dict(attempt.answer_payload or {})
                revision = payload.get("transcription_revision", 0)
                payload["transcription_revision"] = (
                    revision if isinstance(revision, int) else 0
                ) + 1
                attempt.answer_payload = payload
            for job in recovered:
                if job.status == "failed" and job.evaluation_id is not None:
                    evaluation = await self.get_evaluation(
                        attempt_id=attempt.id, evaluation_id=job.evaluation_id
                    )
                    if evaluation is not None:
                        evaluation.status = AiEvaluationStatus.FAILED
                        evaluation.error_message = "shadowing_worker_lease_expired"
                        evaluation.completed_at = current_time
        return len(updated)
