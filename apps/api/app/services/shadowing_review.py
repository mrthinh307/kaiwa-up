"""Snapshot-backed review read models and durable Shadowing processing lifecycle."""

import hashlib
import json
import uuid
from collections import Counter
from datetime import datetime, timedelta

from pydantic import ValidationError
from sqlalchemy import select

from app.exceptions import ForbiddenError
from app.exceptions.shadowing import (
    ShadowingAttemptNotCompletedError,
    ShadowingAttemptNotFoundError,
    ShadowingContentUnavailableError,
    ShadowingInvalidSegmentError,
    ShadowingRecordingsChangedError,
    ShadowingReviewRateLimitError,
)
from app.models.attempt import ExerciseAttempt, Recording
from app.models.content import LearningContent
from app.models.enums import AttemptStatus
from app.models.shadowing import ShadowingAttemptSegment, ShadowingJob
from app.repositories.recording import RecordingRepository
from app.repositories.shadowing_review import ShadowingReviewRepository
from app.repositories.shadowing_worker import ShadowingWorkerRepository
from app.schemas.learning_content import TranscriptSegment
from app.schemas.shadowing import (
    ShadowingAttemptReviewResponse,
    ShadowingComparison,
    ShadowingMode,
    ShadowingProcessingResponse,
    ShadowingSegmentReviewItem,
    ShadowingTranscriptionProgress,
)
from app.services.storage import StorageService
from app.utils.datetime_utils import utc_now


def shadowing_input_fingerprint(payload: dict[str, object]) -> str:
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
    ).hexdigest()


def transcription_progress(statuses: list[str], *, total: int) -> ShadowingTranscriptionProgress:
    counts = Counter(statuses)
    progress = ShadowingTranscriptionProgress(
        total=total,
        recorded=sum(count for state, count in counts.items() if state != "not_recorded"),
        queued=counts["queued"],
        processing=counts["processing"],
        completed=counts["completed"],
        no_speech=counts["no_speech"],
        failed=counts["failed"],
        unavailable=counts["unavailable"],
        not_evaluable=counts["not_evaluable"],
        not_requested=counts["not_requested"],
    )
    if progress.processing:
        progress.status = "processing"
    elif progress.queued:
        progress.status = "queued"
    elif progress.failed or progress.unavailable:
        if progress.completed or progress.no_speech:
            progress.status = "partial_failed"
        else:
            progress.status = "failed" if progress.failed else "unavailable"
    elif progress.not_requested or not progress.recorded:
        progress.status = "not_requested"
    else:
        progress.status = "completed"
    return progress


def effective_transcription_status(
    segment: ShadowingAttemptSegment, job: ShadowingJob | None
) -> str:
    if job is None or job.status == "completed":
        return segment.transcription_status
    if job.status == "failed" and job.error_code in {
        "shadowing_recording_unavailable",
        "shadowing_stt_unavailable",
    }:
        return "unavailable"
    return job.status


class ShadowingReviewService:
    def __init__(
        self, repository: ShadowingReviewRepository, storage_service: StorageService | None = None
    ) -> None:
        self.repository = repository
        self.storage_service = storage_service or StorageService()

    async def ensure_snapshot(
        self, attempt: ExerciseAttempt, content: LearningContent
    ) -> list[ShadowingAttemptSegment]:
        payload = dict(attempt.answer_payload or {})
        if payload.get("schema_version") != 2:
            try:
                transcript = [
                    TranscriptSegment.model_validate(item) for item in content.transcript_ja or []
                ]
            except ValidationError as exc:
                raise ShadowingContentUnavailableError() from exc
            if not transcript or any(
                not segment.script.strip() or segment.end_time_ms <= segment.start_time_ms
                for segment in transcript
            ):
                raise ShadowingContentUnavailableError()
            await self.repository.create_snapshot(attempt_id=attempt.id, segments=transcript)
            payload["schema_version"] = 2
            payload["scoring_policy_version"] = 1
            payload["content_snapshot"] = {
                "title": content.title,
                "difficulty": content.difficulty.value,
                "audio_url": content.audio_url,
                "audio_duration_ms": content.audio_duration_ms,
                "base_exp": content.base_exp,
            }
            attempt.answer_payload = payload
        return await self.repository.get_segments(attempt.id)

    async def request_transcriptions(
        self, *, user_id: uuid.UUID, attempt_id: uuid.UUID, segment_indices: list[int] | None = None
    ) -> ShadowingProcessingResponse:
        recording_repository = RecordingRepository(self.repository.session)
        queued_jobs = 0
        try:
            row = await recording_repository.get_attempt_for_update(attempt_id)
            if row is None:
                raise ShadowingAttemptNotFoundError()
            attempt, content = row
            if attempt.user_id != user_id:
                raise ForbiddenError()
            if attempt.status != AttemptStatus.COMPLETED:
                raise ShadowingAttemptNotCompletedError()
            was_legacy = (attempt.answer_payload or {}).get("schema_version") != 2
            segments = await self.ensure_snapshot(attempt, content)
            payload = dict(attempt.answer_payload or {})
            is_continuous = payload.get("mode") == "continuous"
            if segment_indices is not None and any(
                index < 0 or index >= (1 if is_continuous else len(segments))
                for index in segment_indices
            ):
                raise ShadowingInvalidSegmentError()
            recordings = await recording_repository.get_recordings_by_attempt(attempt.id)
            recordings_by_id = {
                str(recording.id): recording
                for recording in recordings
                if recording.user_id == user_id
            }
            if was_legacy:
                payload["snapshot_origin"] = "legacy"
                entries = payload.get("segments")
                for entry in entries if isinstance(entries, list) else []:
                    if not isinstance(entry, dict):
                        raise ShadowingRecordingsChangedError()
                    try:
                        index = int(str(entry.get("segment_id", "")))
                        segment = segments[index]
                    except (ValueError, IndexError) as exc:
                        raise ShadowingRecordingsChangedError() from exc
                    recording = recordings_by_id.get(str(entry.get("recording_id", "")))
                    if index < 0 or recording is None:
                        raise ShadowingRecordingsChangedError()
                    if segment.recording_id not in {None, recording.id}:
                        raise ShadowingRecordingsChangedError()
                    segment.recording_id = recording.id
                    segment.duration_ms = recording.duration_ms
                    segment.transcription_status = "not_requested"
            jobs = await self.repository.get_jobs(attempt.id)
            by_recording = {
                job.recording_id: job for job in jobs if job.kind == "transcribe_recording"
            }
            candidates: list[tuple[int, uuid.UUID, ShadowingAttemptSegment | None]] = []
            if is_continuous:
                continuous = payload.get("continuous_recording")
                raw_id = (
                    str(continuous.get("recording_id", "")) if isinstance(continuous, dict) else ""
                )
                recording = recordings_by_id.get(raw_id)
                if recording is not None:
                    candidates.append((0, recording.id, None))
            else:
                candidates = [
                    (segment.segment_index, segment.recording_id, segment)
                    for segment in segments
                    if segment.recording_id is not None
                ]
            requested = set(segment_indices) if segment_indices is not None else None
            actions: list[
                tuple[int, uuid.UUID, ShadowingAttemptSegment | None, ShadowingJob | None]
            ] = []
            for index, recording_id, candidate_segment in candidates:
                if requested is not None and index not in requested:
                    continue
                job = by_recording.get(recording_id)
                if job is not None and job.status != "failed":
                    continue
                recording = recordings_by_id[str(recording_id)]
                if recording.expired_at is not None and recording.expired_at <= utc_now():
                    continue
                actions.append((index, recording_id, candidate_segment, job))
            if actions:
                now = utc_now()
                raw_times = payload.get("transcription_retry_times")
                recent: list[str] = []
                for raw in raw_times if isinstance(raw_times, list) else []:
                    try:
                        timestamp = datetime.fromisoformat(str(raw))
                        if timestamp.tzinfo is not None and timestamp > now - timedelta(minutes=1):
                            recent.append(str(raw))
                    except ValueError:
                        continue
                if len(recent) >= 3:
                    raise ShadowingReviewRateLimitError(details={"retry_after_seconds": 60})
                payload["transcription_retry_times"] = [*recent, now.isoformat()]
                for index, recording_id, candidate_segment, job in actions:
                    if job is None:
                        job_payload: dict[str, object] = {
                            "mode": "continuous" if is_continuous else "segmented",
                            "segment_index": index,
                            "recording_id": str(recording_id),
                        }
                        await self.repository.enqueue_job(
                            attempt_id=attempt.id,
                            kind="transcribe_recording",
                            fingerprint=shadowing_input_fingerprint(job_payload),
                            payload=job_payload,
                            recording_id=recording_id,
                        )
                    else:
                        job.status = "queued"
                        job.available_at = now
                        job.max_attempts = job.attempt_count + 3
                        job.error_code = None
                        job.completed_at = None
                        job.lease_token = None
                        job.locked_until = None
                    if candidate_segment is not None:
                        candidate_segment.transcription_status = "queued"
                        candidate_segment.error_code = None
                    queued_jobs += 1
                attempt.review_revision += 1
                previous_revision = payload.get("transcription_revision", 0)
                payload["transcription_revision"] = (
                    previous_revision if isinstance(previous_revision, int) else 0
                ) + 1
            attempt.answer_payload = payload
            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            raise
        review = await self.get_attempt_review(user_id=user_id, attempt_id=attempt_id)
        return ShadowingProcessingResponse(
            attempt_id=attempt_id,
            queued_jobs=queued_jobs,
            review_revision=review.review_revision,
            transcription=review.transcription,
        )

    async def get_attempt_review(
        self, *, user_id: uuid.UUID, attempt_id: uuid.UUID
    ) -> ShadowingAttemptReviewResponse:
        recording_repository = RecordingRepository(self.repository.session)
        row = await recording_repository.get_attempt_for_review(attempt_id)
        if row is None:
            raise ShadowingAttemptNotFoundError()
        attempt, content, earned_exp = row
        if attempt.user_id != user_id:
            raise ForbiddenError()
        payload = attempt.answer_payload or {}
        raw_snapshot = payload.get("content_snapshot")
        snapshot = raw_snapshot if isinstance(raw_snapshot, dict) else {}
        segments = await self.repository.get_segments(attempt.id)
        recordings = await recording_repository.get_recordings_by_attempt(attempt.id)
        by_id = {recording.id: recording for recording in recordings}
        jobs = await self.repository.get_jobs(attempt.id)
        jobs_by_recording = {
            job.recording_id: job for job in jobs if job.kind == "transcribe_recording"
        }
        mode = ShadowingMode(str(payload.get("mode", "segmented")))
        items: list[ShadowingSegmentReviewItem] = []
        for segment in segments:
            job = jobs_by_recording.get(segment.recording_id)
            transcription_status = effective_transcription_status(segment, job)
            recording = by_id.get(segment.recording_id) if segment.recording_id else None
            comparison = (
                ShadowingComparison.model_validate(segment.comparison)
                if segment.comparison and transcription_status in {"completed", "no_speech"}
                else None
            )
            items.append(
                ShadowingSegmentReviewItem.model_validate(
                    {
                        "segment_index": segment.segment_index,
                        "script": segment.script,
                        "start_time_ms": segment.start_time_ms,
                        "end_time_ms": segment.end_time_ms,
                        "recorded": recording is not None,
                        "recording_id": recording.id if recording else None,
                        "playback_url": self.storage_service.get_playback_url(recording.storage_key)
                        if recording
                        else None,
                        "duration_seconds": (recording.duration_ms or 0) // 1000
                        if recording
                        else None,
                        "duration_ms": recording.duration_ms if recording else None,
                        "completion_eligible": segment.completion_eligible,
                        "user_transcript": segment.transcript,
                        "transcription_status": transcription_status,
                        "error_code": job.error_code
                        if job and job.error_code
                        else segment.error_code,
                        "text_match_score": comparison.score if comparison else None,
                        "similarity_score": comparison.score if comparison else None,
                        "comparison_version": comparison.version if comparison else None,
                        "words": comparison.words if comparison else [],
                        "extra_spans": comparison.extra_spans if comparison else [],
                    }
                )
            )
        continuous_recording: Recording | None = None
        progress = transcription_progress(
            [item.transcription_status for item in items], total=len(segments)
        )
        if mode == ShadowingMode.CONTINUOUS:
            continuous_payload = payload.get("continuous_recording")
            if isinstance(continuous_payload, dict):
                recording_id = str(continuous_payload.get("recording_id", ""))
                continuous_recording = next(
                    (rec for rec in recordings if str(rec.id) == recording_id), None
                )
            job = await self.repository.session.scalar(
                select(ShadowingJob)
                .where(
                    ShadowingJob.attempt_id == attempt.id,
                    ShadowingJob.kind == "transcribe_recording",
                )
                .order_by(ShadowingJob.created_at.desc())
                .limit(1)
            )
            state = job.status if job else "not_requested"
            if job and job.result:
                state = str(job.result.get("transcription_status", state))
            progress = transcription_progress([state] if continuous_recording else [], total=1)
        duration_ms = snapshot.get("audio_duration_ms")
        audio_url = snapshot.get("audio_url")
        review = ShadowingAttemptReviewResponse(
            attempt_id=attempt.id,
            attempt_number=attempt.attempt_number,
            content_id=attempt.content_id,
            title=str(snapshot.get("title", content.title)),
            difficulty=str(snapshot.get("difficulty", content.difficulty.value)),
            mode=mode,
            audio_url=str(audio_url) if audio_url else None,
            status=attempt.status,
            score=float(attempt.score) if attempt.score is not None else None,
            earned_exp=earned_exp or 0,
            completed_at=attempt.completed_at,
            total_segments=attempt.total_count
            if attempt.total_count is not None
            else len(segments),
            completed_segments=attempt.correct_count if attempt.correct_count is not None else 0,
            recorded_segments=progress.recorded,
            material_duration_seconds=duration_ms / 1000 if isinstance(duration_ms, int) else None,
            user_continuous_recording_url=self.storage_service.get_playback_url(
                continuous_recording.storage_key
            )
            if continuous_recording
            else None,
            user_continuous_duration_seconds=(continuous_recording.duration_ms or 0) // 1000
            if continuous_recording
            else None,
            user_continuous_transcript=continuous_recording.transcription_ja
            if continuous_recording
            else None,
            segments=items,
            transcription=progress,
            review_revision=attempt.review_revision,
            reference_version="legacy_reference_unversioned"
            if payload.get("snapshot_origin") == "legacy"
            else "snapshot_v2",
        )
        from app.services.shadowing_evaluation import ShadowingEvaluationService

        review.ai_review, review.ai_feedback = await ShadowingEvaluationService(
            self.repository
        ).read_feedback(attempt)
        if progress.queued or progress.processing:
            progress.is_delayed = (
                review.ai_review.is_delayed
                if review.ai_review.status in {"queued", "processing"}
                else not await ShadowingWorkerRepository(self.repository.session).is_online()
            )
        return review
