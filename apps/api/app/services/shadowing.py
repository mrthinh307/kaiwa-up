import contextlib
import hashlib
import logging
import uuid
from decimal import ROUND_HALF_UP, Decimal
from difflib import SequenceMatcher
from typing import Any

import pykakasi
from fastapi import UploadFile
from pydantic import ValidationError

from app.exceptions import AttemptAlreadyInProgressError, ForbiddenError, NotFoundError
from app.exceptions.shadowing import (
    ShadowingAttemptModeMismatchError,
    ShadowingAttemptNotFoundError,
    ShadowingAttemptNotInProgressError,
    ShadowingAudioTooLargeError,
    ShadowingContentNotFoundError,
    ShadowingContentUnavailableError,
    ShadowingInvalidAudioError,
    ShadowingInvalidSegmentError,
    ShadowingNoRecordingsError,
    ShadowingRecordingIdempotencyConflictError,
    ShadowingRecordingsChangedError,
)
from app.integrations.ai.base import AiGateway
from app.models.attempt import ExerciseAttempt, Recording
from app.models.content import LearningContent
from app.models.enums import AttemptStatus, ContentStatus, ContentType, PracticeMethod
from app.models.shadowing import ShadowingAttemptSegment
from app.repositories.gamification import GamificationRepository
from app.repositories.recording import RecordingRepository
from app.repositories.shadowing_review import ShadowingReviewRepository
from app.schemas.learning_content import ShadowingContentDetail, TranscriptSegment
from app.schemas.shadowing import (
    ShadowingAiFeedback,
    ShadowingAiReviewState,
    ShadowingAttemptPracticeResponse,
    ShadowingAttemptReviewResponse,
    ShadowingContinuousRecordingSummary,
    ShadowingCorrection,
    ShadowingMode,
    ShadowingRecordContinuousResponse,
    ShadowingRecordedSegmentSummary,
    ShadowingRecordingPlaybackResponse,
    ShadowingRecordSegmentResponse,
    ShadowingResumeResponse,
    ShadowingSegmentReviewItem,
    ShadowingStartResponse,
    ShadowingSubmitResponse,
    ShadowingSubmittedRecording,
    ShadowingUserProgressSummary,
    ShadowingWordFeedback,
    ShadowingWordStatus,
)
from app.services.leveling import level_for_total_exp, minimum_exp_for_level
from app.services.shadowing_audio import ShadowingAudioMetadata, inspect_shadowing_audio
from app.services.shadowing_review import (
    ShadowingReviewService,
    shadowing_input_fingerprint,
    transcription_progress,
)
from app.services.storage import SavedRecordingAudio, StorageService
from app.utils.datetime_utils import utc_now

logger = logging.getLogger(__name__)

MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024  # 10MB

_KAKASI = pykakasi.kakasi()  # type: ignore[no-untyped-call]
_PUNCTUATION_CHARS = set(
    " \t\n\r\u3000、。！？「」『』・…〜～（）【】：；―“”‘’.,!?;:'\"()[]{}-–—/\\"
)


def strip_punctuation(text: str) -> str:
    """Strip Japanese and ASCII punctuation and whitespace."""
    if not text:
        return ""
    return "".join(c for c in text if c not in _PUNCTUATION_CHARS)


def tokenize_japanese_text(text: str) -> list[dict[str, str]]:
    """Tokenize Japanese text into word/chunk dictionaries with orig, hira, kana."""
    clean = strip_punctuation(text)
    if not clean:
        return []
    result = _KAKASI.convert(clean)
    return [{"orig": item["orig"], "hira": item["hira"], "kana": item["kana"]} for item in result]


def compute_word_diffs(ref_text: str, user_text: str) -> list[ShadowingWordFeedback]:
    """Compute word-level alignment and status tagging between reference and user transcripts."""
    ref_tokens = tokenize_japanese_text(ref_text)
    user_tokens = tokenize_japanese_text(user_text)

    if not ref_tokens:
        return []

    clean_user = strip_punctuation(user_text)
    if not clean_user:
        return [
            ShadowingWordFeedback(
                word=tok["orig"],
                status=ShadowingWordStatus.MISSING,
                user_word=None,
            )
            for tok in ref_tokens
        ]

    ref_token_slices = []
    curr = 0
    for tok in ref_tokens:
        h_len = len(tok["hira"])
        ref_token_slices.append((curr, curr + h_len, tok))
        curr += h_len
    ref_hira_full = "".join(tok["hira"] for tok in ref_tokens)
    user_hira_full = "".join(tok["hira"] for tok in user_tokens)

    matcher = SequenceMatcher(None, ref_hira_full, user_hira_full)
    matching_blocks = matcher.get_matching_blocks()
    opcodes = matcher.get_opcodes()

    word_feedbacks: list[ShadowingWordFeedback] = []
    for start, end, tok in ref_token_slices:
        tok_len = end - start
        if tok_len == 0:
            continue
        matched_chars = 0
        for b_ref, _b_user, b_len in matching_blocks:
            overlap_start = max(start, b_ref)
            overlap_end = min(end, b_ref + b_len)
            if overlap_end > overlap_start:
                matched_chars += overlap_end - overlap_start

        match_ratio = matched_chars / tok_len if tok_len > 0 else 0.0
        if match_ratio >= 0.7:
            word_feedbacks.append(
                ShadowingWordFeedback(
                    word=tok["orig"],
                    status=ShadowingWordStatus.CORRECT,
                    user_word=tok["orig"],
                )
            )
        else:
            replaced_user_chunks = []
            for tag, i1, i2, j1, j2 in opcodes:
                if tag in ("replace", "insert") and not (i2 <= start or i1 >= end):
                    replaced_user_chunks.append(user_hira_full[j1:j2])
            user_word = "".join(replaced_user_chunks) if replaced_user_chunks else None
            status = (
                ShadowingWordStatus.INCORRECT
                if (user_word or match_ratio > 0.1)
                else ShadowingWordStatus.MISSING
            )
            word_feedbacks.append(
                ShadowingWordFeedback(
                    word=tok["orig"],
                    status=status,
                    user_word=user_word,
                )
            )

    return word_feedbacks


def calculate_shadowing_score(*, completed_count: int, total_count: int) -> Decimal:
    if total_count <= 0:
        return Decimal("0.00")
    ratio = Decimal(completed_count) * Decimal(100) / Decimal(total_count)
    return ratio.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_shadowing_exp(*, base_exp: int, completed_count: int, total_count: int) -> int:
    if completed_count <= 0 or total_count <= 0:
        return 0
    ratio = completed_count / total_count
    if ratio < 0.05:
        return max(1, round(base_exp * 0.10))
    elif ratio < 0.25:
        return round(base_exp * 0.30)
    elif ratio < 0.50:
        return round(base_exp * 0.50)
    elif ratio < 0.75:
        return round(base_exp * 0.80)
    else:
        return base_exp


class ShadowingService:
    def __init__(
        self,
        repository: RecordingRepository,
        storage_service: StorageService | None = None,
        ai_gateway: AiGateway | None = None,
    ) -> None:
        self.repository = repository
        self.storage_service = storage_service or StorageService()
        self.ai_gateway = ai_gateway

    async def start_attempt(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        mode: ShadowingMode,
    ) -> ShadowingStartResponse:
        content = await self.repository.get_shadowing_content(content_id)
        if content is None:
            raise ShadowingContentNotFoundError()

        transcript_segments = self._validated_transcript(content)
        if not content.audio_url:
            raise ShadowingContentUnavailableError()

        try:
            await self.repository.lock_user(user_id)
            existing_row = await self.repository.get_latest_in_progress_attempt(
                user_id=user_id,
                content_id=content_id,
            )
            if existing_row is not None:
                raise AttemptAlreadyInProgressError(
                    attempt_id=existing_row[0].id,
                    practice_method=PracticeMethod.SHADOWING,
                )

            attempt_number = await self.repository.get_next_attempt_number(
                user_id=user_id,
                content_id=content_id,
            )
            attempt = await self.repository.create_attempt(
                user_id=user_id,
                content_id=content_id,
                attempt_number=attempt_number,
                answer_payload={"mode": mode.value},
            )
            await ShadowingReviewService(
                ShadowingReviewRepository(self.repository.session), self.storage_service
            ).ensure_snapshot(attempt, content)
            total_attempts = await self.repository.get_total_attempt_count(
                user_id=user_id,
                content_id=content_id,
            )
            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            raise

        return ShadowingStartResponse(
            attempt_id=attempt.id,
            content_id=content.id,
            attempt_number=attempt.attempt_number,
            mode=mode,
            total_segments=len(transcript_segments),
            total_attempts=total_attempts,
        )

    async def record_segment(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        segment_id: str,
        audio_file: UploadFile,
        attempt_id: uuid.UUID | None = None,
        client_recording_id: uuid.UUID | None = None,
        expected_recording_id: uuid.UUID | None = None,
    ) -> ShadowingRecordSegmentResponse:
        try:
            index = int(segment_id)
        except ValueError as exc:
            raise ShadowingInvalidSegmentError() from exc
        if index < 0:
            raise ShadowingInvalidSegmentError()
        recording = await self._record_audio(
            user_id=user_id,
            content_id=content_id,
            audio_file=audio_file,
            attempt_id=attempt_id,
            segment_index=index,
            client_recording_id=client_recording_id,
            expected_recording_id=expected_recording_id,
        )
        assert recording.attempt_id is not None
        return ShadowingRecordSegmentResponse(
            recording_id=recording.id,
            attempt_id=recording.attempt_id,
            segment_id=str(index),
            storage_key=recording.storage_key,
            duration_seconds=(recording.duration_ms or 0) // 1000,
            duration_ms=recording.duration_ms,
            created_at=recording.created_at,
        )

    async def record_continuous(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        audio_file: UploadFile,
        duration_seconds: int | None = None,
        attempt_id: uuid.UUID | None = None,
        client_recording_id: uuid.UUID | None = None,
        expected_recording_id: uuid.UUID | None = None,
    ) -> ShadowingRecordContinuousResponse:
        # duration_seconds remains accepted for old clients; only inspected media time is used.
        recording = await self._record_audio(
            user_id=user_id,
            content_id=content_id,
            audio_file=audio_file,
            attempt_id=attempt_id,
            segment_index=None,
            client_recording_id=client_recording_id,
            expected_recording_id=expected_recording_id,
        )
        assert recording.attempt_id is not None
        return ShadowingRecordContinuousResponse(
            recording_id=recording.id,
            attempt_id=recording.attempt_id,
            storage_key=recording.storage_key,
            duration_seconds=(recording.duration_ms or 0) // 1000,
            duration_ms=recording.duration_ms,
            created_at=recording.created_at,
        )

    @staticmethod
    def _current_take_id(
        attempt: ExerciseAttempt, segments: list[ShadowingAttemptSegment], index: int | None
    ) -> uuid.UUID | None:
        payload = attempt.answer_payload or {}
        if index is None:
            entry = payload.get("continuous_recording")
            raw_id = entry.get("recording_id") if isinstance(entry, dict) else None
        else:
            if segments[index].recording_id is not None:
                return segments[index].recording_id
            entries = payload.get("segments")
            raw_id = None
            for entry in entries if isinstance(entries, list) else []:
                if not isinstance(entry, dict):
                    continue
                try:
                    same_index = int(str(entry.get("segment_id", ""))) == index
                except ValueError:
                    continue
                if same_index:
                    raw_id = entry.get("recording_id")
        if raw_id is None:
            return None
        try:
            return uuid.UUID(str(raw_id))
        except ValueError as exc:
            raise ShadowingRecordingsChangedError() from exc

    async def _record_audio(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        audio_file: UploadFile,
        attempt_id: uuid.UUID | None,
        segment_index: int | None,
        client_recording_id: uuid.UUID | None,
        expected_recording_id: uuid.UUID | None,
    ) -> Recording:
        content_bytes = await audio_file.read(MAX_AUDIO_SIZE_BYTES + 1)
        if not content_bytes:
            raise ShadowingInvalidAudioError()
        if len(content_bytes) > MAX_AUDIO_SIZE_BYTES:
            raise ShadowingAudioTooLargeError()
        content_sha256 = hashlib.sha256(content_bytes).hexdigest()
        mode = ShadowingMode.CONTINUOUS if segment_index is None else ShadowingMode.SEGMENTED
        metadata: ShadowingAudioMetadata | None = None
        saved: SavedRecordingAudio | None = None
        is_published = False
        review_service = ShadowingReviewService(
            ShadowingReviewRepository(self.repository.session), self.storage_service
        )
        try:
            if attempt_id is None:
                content = await self.repository.get_shadowing_content(content_id)
                if content is None:
                    raise ShadowingContentNotFoundError()
                transcript = self._validated_transcript(content)
                if segment_index is not None and segment_index >= len(transcript):
                    raise ShadowingInvalidSegmentError()
                metadata = await inspect_shadowing_audio(content_bytes, audio_file.content_type)
                started = await self.start_attempt(
                    user_id=user_id, content_id=content_id, mode=mode
                )
                attempt_id = started.attempt_id

            row = await self.repository.get_attempt_for_update(attempt_id)
            if row is None or row[0].content_id != content_id:
                raise ShadowingAttemptNotFoundError()
            attempt, content = row
            if attempt.user_id != user_id:
                raise ForbiddenError()
            stored_mode = str((attempt.answer_payload or {}).get("mode", mode.value))
            if stored_mode != mode.value:
                raise ShadowingAttemptModeMismatchError(
                    attempt_mode=stored_mode, requested_mode=mode.value
                )
            if client_recording_id is not None:
                existing = await self.repository.get_recording_by_client_id(
                    user_id=user_id, attempt_id=attempt_id, client_recording_id=client_recording_id
                )
                if existing is not None:
                    if (
                        existing.content_sha256 != content_sha256
                        or existing.shadowing_segment_index != segment_index
                    ):
                        raise ShadowingRecordingIdempotencyConflictError()
                    await self.repository.session.commit()
                    return existing
            if attempt.status != AttemptStatus.IN_PROGRESS:
                raise ShadowingAttemptNotInProgressError()
            segments = await review_service.ensure_snapshot(attempt, content)
            if segment_index is not None and segment_index >= len(segments):
                raise ShadowingInvalidSegmentError()
            previous_id = self._current_take_id(attempt, segments, segment_index)
            if client_recording_id is not None and previous_id != expected_recording_id:
                raise ShadowingRecordingsChangedError()
            # Persist only the snapshot, then release all row locks before media/storage I/O.
            await self.repository.session.commit()
            if metadata is None:
                metadata = await inspect_shadowing_audio(content_bytes, audio_file.content_type)
            saved = await self.storage_service.save_recording_audio(
                user_id=user_id, attempt_id=attempt_id, content=content_bytes, metadata=metadata
            )

            row = await self.repository.get_attempt_for_update(attempt_id)
            if row is None:
                raise ShadowingAttemptNotFoundError()
            attempt = row[0]
            # A competing request may have committed this exact client take during upload.
            if client_recording_id is not None:
                existing = await self.repository.get_recording_by_client_id(
                    user_id=user_id, attempt_id=attempt_id, client_recording_id=client_recording_id
                )
                if existing is not None:
                    if (
                        existing.content_sha256 != content_sha256
                        or existing.shadowing_segment_index != segment_index
                    ):
                        raise ShadowingRecordingIdempotencyConflictError()
                    await self.repository.session.commit()
                    return existing
            if attempt.status != AttemptStatus.IN_PROGRESS:
                raise ShadowingAttemptNotInProgressError()
            segments = await review_service.repository.get_segments(attempt.id)
            if self._current_take_id(attempt, segments, segment_index) != previous_id:
                raise ShadowingRecordingsChangedError()
            recording = await self.repository.create_recording(
                user_id=user_id,
                attempt_id=attempt_id,
                storage_key=saved.storage_key,
                duration_ms=metadata.duration_ms,
                mime_type=metadata.mime_type,
                client_recording_id=client_recording_id,
                content_sha256=content_sha256,
                shadowing_segment_index=segment_index,
            )
            payload = dict(attempt.answer_payload or {})
            payload["mode"] = mode.value
            entry: dict[str, object] = {
                "recording_id": str(recording.id),
                "storage_key": recording.storage_key,
                "duration_ms": metadata.duration_ms,
                "duration_seconds": metadata.duration_ms // 1000,
            }
            if segment_index is None:
                payload["continuous_recording"] = entry
            else:
                segment = segments[segment_index]
                segment.recording_id = recording.id
                segment.duration_ms = metadata.duration_ms
                segment.completion_eligible = metadata.duration_ms >= 2000
                segment.transcription_status = "not_requested"
                segment.transcript = None
                segment.comparison = None
                segment.error_code = None
                entry["segment_id"] = str(segment_index)
                raw_entries = payload.get("segments")
                # Preserve explicitly mapped legacy takes in untouched segments.
                entries_by_index: dict[int, dict[str, object]] = {}
                for old_entry in raw_entries if isinstance(raw_entries, list) else []:
                    if isinstance(old_entry, dict):
                        try:
                            entries_by_index[int(str(old_entry.get("segment_id", "")))] = old_entry
                        except ValueError:
                            continue
                entries_by_index[segment_index] = entry
                payload["segments"] = [
                    entries_by_index[index] for index in sorted(entries_by_index)
                ]
            attempt.answer_payload = payload
            await self.repository.session.commit()
            is_published = True
            return recording
        except Exception:
            await self.repository.session.rollback()
            raise
        finally:
            if saved is not None and not is_published:
                # A lost commit response has an uncertain outcome. Reconcile against the DB
                # before deleting an asset that may already back a successfully saved take.
                try:
                    referenced = await self.repository.get_recording_by_storage_key(
                        saved.storage_key
                    )
                    if referenced is None:
                        await self.storage_service.delete_recording_audio(saved)
                except Exception:
                    logger.warning(
                        "Unpublished recording cleanup deferred after storage/database failure"
                    )

    async def get_recording_playback(
        self,
        *,
        user_id: uuid.UUID,
        recording_id: uuid.UUID,
    ) -> ShadowingRecordingPlaybackResponse:
        recording = await self.repository.get_recording_by_id(recording_id)
        if recording is None:
            raise NotFoundError("Recording not found")

        if recording.user_id != user_id:
            raise ForbiddenError("You do not have access to this recording")

        playback_url = self.storage_service.get_playback_url(recording.storage_key)
        duration_seconds = (recording.duration_ms or 0) // 1000

        return ShadowingRecordingPlaybackResponse(
            recording_id=recording.id,
            playback_url=playback_url,
            duration_seconds=duration_seconds,
            created_at=recording.created_at,
        )

    async def submit_attempt(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        attempt_id: uuid.UUID,
        replay_count: int = 0,
        request_ai_review: bool = False,
        recordings_manifest: list[ShadowingSubmittedRecording] | None = None,
    ) -> ShadowingSubmitResponse:
        """Freeze the accepted recordings and reward once; never call external providers."""
        review_service = ShadowingReviewService(
            ShadowingReviewRepository(self.repository.session), self.storage_service
        )
        gamification_repo = GamificationRepository(self.repository.session)
        try:
            row = await self.repository.get_attempt_for_update(attempt_id)
            if row is None or row[1].content_type != ContentType.SHADOWING_DICTATION:
                raise ShadowingAttemptNotFoundError()
            attempt, content = row
            if attempt.content_id != content_id:
                raise ShadowingAttemptNotFoundError()
            if attempt.user_id != user_id:
                raise ForbiddenError()

            if attempt.status != AttemptStatus.COMPLETED:
                segments = await review_service.ensure_snapshot(attempt, content)
                all_recordings = await self.repository.get_recordings_by_attempt(attempt_id)
                by_id = {
                    str(recording.id): recording
                    for recording in all_recordings
                    if recording.user_id == user_id
                }
                payload = dict(attempt.answer_payload or {})
                snapshot_value = payload.get("content_snapshot")
                snapshot = snapshot_value if isinstance(snapshot_value, dict) else {}
                is_continuous = payload.get("mode") == ShadowingMode.CONTINUOUS.value
                selected: dict[int, Recording] = {}
                completed_count = 0
                if is_continuous:
                    continuous = payload.get("continuous_recording")
                    if isinstance(continuous, dict):
                        recording = by_id.get(str(continuous.get("recording_id", "")))
                        if recording is not None:
                            selected[0] = recording
                    if selected:
                        material_ms = snapshot.get("audio_duration_ms")
                        total_duration = (
                            material_ms
                            if isinstance(material_ms, int) and material_ms > 0
                            else len(segments) * 5000
                        )
                        ratio = (
                            min(1.0, (selected[0].duration_ms or 0) / total_duration)
                            if total_duration
                            else 0
                        )
                        completed_count = min(len(segments), round(ratio * len(segments)))
                else:
                    raw_segments = payload.get("segments")
                    if isinstance(raw_segments, list):
                        for entry in raw_segments:
                            if not isinstance(entry, dict):
                                raise ShadowingRecordingsChangedError()
                            try:
                                index = int(str(entry.get("segment_id", "")))
                            except ValueError as exc:
                                raise ShadowingRecordingsChangedError() from exc
                            recording = by_id.get(str(entry.get("recording_id", "")))
                            if index < 0 or index >= len(segments) or recording is None:
                                raise ShadowingRecordingsChangedError()
                            if index in selected and selected[index].id != recording.id:
                                raise ShadowingRecordingsChangedError()
                            selected[index] = recording
                    # Snapshot rows are authoritative for v2 uploads. Legacy rows are hydrated
                    # only from explicit IDs above, never from upload ordering.
                    for segment in segments:
                        if segment.recording_id is not None:
                            recording = by_id.get(str(segment.recording_id))
                            if recording is None:
                                raise ShadowingRecordingsChangedError()
                            selected[segment.segment_index] = recording

                if not selected:
                    raise ShadowingNoRecordingsError()
                actual_manifest = {index: recording.id for index, recording in selected.items()}
                if recordings_manifest is not None:
                    expected = {
                        entry.segment_index: entry.recording_id for entry in recordings_manifest
                    }
                    if len(expected) != len(recordings_manifest) or expected != actual_manifest:
                        raise ShadowingRecordingsChangedError()

                jobs: list[dict[str, object]] = []
                for index, recording in selected.items():
                    if not is_continuous:
                        segment = segments[index]
                        segment.recording_id = recording.id
                        segment.duration_ms = recording.duration_ms
                        segment.completion_eligible = (recording.duration_ms or 0) >= 2000
                        segment.transcription_status = "queued"
                        segment.error_code = None
                        completed_count += int(segment.completion_eligible)
                    job_payload: dict[str, object] = {
                        "mode": "continuous" if is_continuous else "segmented",
                        "segment_index": index,
                        "recording_id": str(recording.id),
                    }
                    jobs.append(
                        {
                            "attempt_id": attempt.id,
                            "kind": "transcribe_recording",
                            "recording_id": recording.id,
                            "input_fingerprint": shadowing_input_fingerprint(job_payload),
                            "batch_index": 0,
                            "payload": job_payload,
                        }
                    )
                await review_service.repository.enqueue_jobs(jobs)
                score = calculate_shadowing_score(
                    completed_count=completed_count, total_count=len(segments)
                )
                base_exp_value = snapshot.get("base_exp", content.base_exp)
                base_exp = base_exp_value if isinstance(base_exp_value, int) else content.base_exp
                xp_earned = calculate_shadowing_exp(
                    base_exp=base_exp, completed_count=completed_count, total_count=len(segments)
                )
                payload["replay_count"] = replay_count
                payload["completed_segment_count"] = completed_count
                payload["total_segments"] = len(segments)
                payload["score"] = float(score)
                attempt.review_revision += 1
                await self.repository.complete_attempt(
                    attempt,
                    score=score,
                    correct_count=completed_count,
                    total_count=len(segments),
                    answer_payload=payload,
                    completed_at=utc_now(),
                )
                progress = await gamification_repo.get_or_create_user_progress_for_update(user_id)
                if xp_earned > 0:
                    prior_rewarded = await self.repository.count_prior_rewarded_attempts(
                        user_id=user_id, content_id=content_id, exclude_attempt_id=attempt_id
                    )
                    await gamification_repo.insert_transaction(
                        user_id=user_id,
                        attempt_id=attempt_id,
                        amount=xp_earned,
                        reason=f"Hoàn thành Shadowing: {snapshot.get('title', content.title)}"[
                            :100
                        ],
                    )
                    progress.total_exp += xp_earned
                    progress.current_level = level_for_total_exp(progress.total_exp)
                    if prior_rewarded == 0:
                        progress.completed_content_count += 1
                await self.repository.session.commit()
            else:
                # Release the attempt lock before building the read response.
                await self.repository.session.commit()

            transaction = await gamification_repo.find_transaction_by_attempt(attempt_id)
            progress = await gamification_repo.get_or_create_user_progress(user_id)
            review = await self.get_attempt_review(user_id=user_id, attempt_id=attempt_id)
            return ShadowingSubmitResponse(
                attempt_id=attempt_id,
                status=AttemptStatus.COMPLETED,
                score=review.score if review.score is not None else 0.0,
                xp_earned=transaction.amount if transaction else 0,
                difficulty=review.difficulty,
                message="Bạn đã hoàn thành bài luyện.",
                user_progress=ShadowingUserProgressSummary(
                    total_exp=progress.total_exp,
                    current_level=progress.current_level,
                    exp_to_next_level=max(
                        0, minimum_exp_for_level(progress.current_level + 1) - progress.total_exp
                    ),
                ),
                completed_at=review.completed_at or utc_now(),
                ai_feedback=review.ai_feedback,
                transcription=review.transcription,
                ai_review=review.ai_review,
                review_revision=review.review_revision,
                ai_review_deferred=request_ai_review,
            )
        except Exception:
            await self.repository.session.rollback()
            raise

    async def get_attempt_review(
        self,
        *,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
    ) -> ShadowingAttemptReviewResponse:
        row = await self.repository.get_attempt_for_review(attempt_id)
        if row is None or row[1].content_type != ContentType.SHADOWING_DICTATION:
            raise ShadowingAttemptNotFoundError()

        attempt, content, earned_exp = row
        if attempt.user_id != user_id:
            raise ForbiddenError()

        if (attempt.answer_payload or {}).get("schema_version") == 2:
            return await ShadowingReviewService(
                ShadowingReviewRepository(self.repository.session), self.storage_service
            ).get_attempt_review(user_id=user_id, attempt_id=attempt_id)

        transcript_segments = content.transcript_ja or []
        total_count = len(transcript_segments)
        recordings = await self.repository.get_recordings_by_attempt(attempt_id)

        mode_str = (attempt.answer_payload or {}).get("mode")
        is_continuous = mode_str == ShadowingMode.CONTINUOUS.value or "continuous_recording" in (
            attempt.answer_payload or {}
        )

        mode = ShadowingMode.CONTINUOUS if is_continuous else ShadowingMode.SEGMENTED
        user_continuous_recording_url: str | None = None
        user_continuous_duration_seconds: int | None = None

        continuous_rec: Recording | None = None
        if is_continuous:
            cont_data = (attempt.answer_payload or {}).get("continuous_recording", {})
            storage_key = cont_data.get("storage_key") if isinstance(cont_data, dict) else None
            rec_id_str = cont_data.get("recording_id") if isinstance(cont_data, dict) else None

            for r in recordings:
                if rec_id_str and str(r.id) == str(rec_id_str):
                    continuous_rec = r
                    break
                if storage_key and r.storage_key == storage_key:
                    continuous_rec = r
                    break

            if continuous_rec is None and recordings:
                continuous_rec = recordings[-1]

            if not storage_key and continuous_rec:
                storage_key = continuous_rec.storage_key
            if storage_key:
                user_continuous_recording_url = self.storage_service.get_playback_url(storage_key)
            if isinstance(cont_data, dict) and "duration_seconds" in cont_data:
                user_continuous_duration_seconds = int(cont_data["duration_seconds"])
            elif continuous_rec:
                user_continuous_duration_seconds = int((continuous_rec.duration_ms or 0) // 1000)

        raw_payload_segments = (attempt.answer_payload or {}).get("segments")
        payload_segments = raw_payload_segments if isinstance(raw_payload_segments, list) else []
        payload_by_id = {
            str(seg.get("segment_id")): seg
            for seg in payload_segments
            if isinstance(seg, dict) and "segment_id" in seg
        }

        recordings_by_id = {str(rec.id): rec for rec in recordings}

        ai_evaluation = await self.repository.get_latest_ai_evaluation(attempt_id)
        ai_feedback: ShadowingAiFeedback | None = None
        details_dict: dict[str, Any] = {}
        segment_evaluations: dict[str, Any] = {}

        if ai_evaluation is not None:
            details_dict = ai_evaluation.details if isinstance(ai_evaluation.details, dict) else {}
            raw_seg_evals = details_dict.get("segment_evaluations")
            segment_evaluations = raw_seg_evals if isinstance(raw_seg_evals, dict) else {}
            raw_corrections = details_dict.get("corrections", [])
            corrections_list: list[ShadowingCorrection] = []
            if isinstance(raw_corrections, list):
                for c in raw_corrections:
                    if isinstance(c, dict) and "original" in c and "corrected" in c:
                        corrections_list.append(
                            ShadowingCorrection(
                                original=str(c.get("original", "")),
                                corrected=str(c.get("corrected", "")),
                                reason=str(c.get("reason", "")),
                            )
                        )
            raw_hints = details_dict.get("hints", [])
            hints_list = [str(h) for h in raw_hints] if isinstance(raw_hints, list) else []

            raw_words = details_dict.get("words", [])
            words_list: list[ShadowingWordFeedback] = []
            if isinstance(raw_words, list):
                for w in raw_words:
                    if isinstance(w, dict) and "word" in w and "status" in w:
                        words_list.append(
                            ShadowingWordFeedback(
                                word=str(w.get("word", "")),
                                status=ShadowingWordStatus(w.get("status", "correct")),
                                user_word=str(w.get("user_word"))
                                if w.get("user_word") is not None
                                else None,
                            )
                        )

            ai_feedback = ShadowingAiFeedback(
                similarity_score=float(ai_evaluation.similarity_score)
                if ai_evaluation.similarity_score is not None
                else None,
                fluency_score=float(ai_evaluation.fluency_score)
                if ai_evaluation.fluency_score is not None
                else None,
                feedback=ai_evaluation.feedback,
                corrections=corrections_list,
                hints=hints_list,
                user_transcript=str(details_dict.get("user_transcript"))
                if details_dict.get("user_transcript")
                else None,
                words=words_list,
            )

        review_segments: list[ShadowingSegmentReviewItem] = []
        completed_count = 0

        for index, seg_data in enumerate(transcript_segments):
            seg_str_id = str(index)
            script = str(seg_data.get("script", "")) if isinstance(seg_data, dict) else ""
            raw_start = seg_data.get("start_time_ms", 0) if isinstance(seg_data, dict) else 0
            raw_end = seg_data.get("end_time_ms", 0) if isinstance(seg_data, dict) else 0
            start_time_ms = int(raw_start) if isinstance(raw_start, int | float | str) else 0
            end_time_ms = int(raw_end) if isinstance(raw_end, int | float | str) else 0

            seg_payload = payload_by_id.get(seg_str_id)
            rec_id_str = (
                str(seg_payload.get("recording_id"))
                if seg_payload and seg_payload.get("recording_id")
                else None
            )

            rec = None
            if rec_id_str and rec_id_str in recordings_by_id:
                rec = recordings_by_id[rec_id_str]
            elif not payload_segments and not is_continuous and index < len(recordings):
                rec = recordings[index]

            is_recorded = False
            rec_uuid = None
            playback_url = None
            duration_s = None

            if is_continuous:
                is_recorded = True
            elif rec is not None:
                is_recorded = True
                rec_uuid = rec.id
                playback_url = self.storage_service.get_playback_url(rec.storage_key)
                duration_s = (rec.duration_ms or 0) // 1000
                if (rec.duration_ms or 0) >= 2000:
                    completed_count += 1
            elif seg_payload:
                is_recorded = True
                storage_key = str(seg_payload.get("storage_key", ""))
                if storage_key:
                    playback_url = self.storage_service.get_playback_url(storage_key)
                raw_dur_s = seg_payload.get("duration_seconds", 0)
                raw_dur_ms = seg_payload.get("duration_ms", 0)
                dur_seconds = int(raw_dur_s) if isinstance(raw_dur_s, int | float | str) else 0
                dur_ms = int(raw_dur_ms) if isinstance(raw_dur_ms, int | float | str) else 0
                duration_s = dur_seconds or (dur_ms // 1000)
                if dur_seconds >= 2 or dur_ms >= 2000:
                    completed_count += 1

            user_transcript_seg = None
            if rec is not None and rec.transcription_ja:
                user_transcript_seg = rec.transcription_ja
            elif ai_evaluation and isinstance(ai_evaluation.details, dict):
                seg_transcripts = ai_evaluation.details.get("segment_transcripts")
                if isinstance(seg_transcripts, dict) and seg_str_id in seg_transcripts:
                    user_transcript_seg = str(seg_transcripts[seg_str_id])

            seg_eval = segment_evaluations.get(seg_str_id, {})
            seg_sim_score = (
                float(seg_eval["similarity_score"])
                if isinstance(seg_eval, dict) and seg_eval.get("similarity_score") is not None
                else None
            )
            raw_seg_words = seg_eval.get("words", []) if isinstance(seg_eval, dict) else []
            seg_words: list[ShadowingWordFeedback] = []
            if isinstance(raw_seg_words, list) and raw_seg_words:
                for w in raw_seg_words:
                    if isinstance(w, dict) and "word" in w and "status" in w:
                        seg_words.append(
                            ShadowingWordFeedback(
                                word=str(w.get("word", "")),
                                status=ShadowingWordStatus(w.get("status", "correct")),
                                user_word=str(w.get("user_word"))
                                if w.get("user_word") is not None
                                else None,
                            )
                        )
            elif is_recorded and user_transcript_seg and script:
                seg_words = compute_word_diffs(script, user_transcript_seg)
                if seg_sim_score is None:
                    correct_c = sum(1 for w in seg_words if w.status == ShadowingWordStatus.CORRECT)
                    seg_sim_score = (
                        round((correct_c / len(seg_words)) * 100, 2) if seg_words else 100.0
                    )

            review_segments.append(
                ShadowingSegmentReviewItem(
                    segment_index=index,
                    script=script,
                    start_time_ms=start_time_ms,
                    end_time_ms=end_time_ms,
                    recorded=is_recorded,
                    recording_id=rec_uuid,
                    playback_url=playback_url,
                    duration_seconds=duration_s,
                    user_transcript=user_transcript_seg if not is_continuous else None,
                    similarity_score=seg_sim_score if not is_continuous else None,
                    words=seg_words if not is_continuous else [],
                    transcription_status=(
                        "not_recorded"
                        if is_continuous or not is_recorded
                        else "completed"
                        if user_transcript_seg
                        else "no_speech"
                        if rec is not None and rec.transcription_ja == ""
                        else "unavailable"
                        if rec is None
                        or (rec.expired_at is not None and rec.expired_at <= utc_now())
                        else "not_requested"
                    ),
                )
            )

        if is_continuous:
            completed_count = attempt.correct_count if attempt.correct_count is not None else 0

        user_continuous_transcript = None
        if is_continuous:
            if continuous_rec and continuous_rec.transcription_ja:
                user_continuous_transcript = continuous_rec.transcription_ja
            elif ai_feedback and ai_feedback.user_transcript:
                user_continuous_transcript = ai_feedback.user_transcript
            elif (attempt.answer_payload or {}).get("continuous_transcript"):
                user_continuous_transcript = str(
                    (attempt.answer_payload or {}).get("continuous_transcript")
                )

        if is_continuous and ai_feedback and not ai_feedback.words and user_continuous_transcript:
            ref_script_full = " ".join(
                str(s.get("script", "")) for s in transcript_segments if isinstance(s, dict)
            ).strip()
            if ref_script_full:
                ai_feedback.words = compute_word_diffs(ref_script_full, user_continuous_transcript)

        return ShadowingAttemptReviewResponse(
            attempt_id=attempt.id,
            attempt_number=attempt.attempt_number,
            content_id=content.id,
            title=content.title,
            difficulty=content.difficulty.value,
            mode=mode,
            audio_url=content.audio_url,
            status=attempt.status,
            score=float(attempt.score) if attempt.score is not None else None,
            earned_exp=earned_exp or 0,
            completed_at=attempt.completed_at,
            total_segments=total_count,
            completed_segments=completed_count,
            material_duration_seconds=float(content.audio_duration_ms / 1000.0)
            if content.audio_duration_ms is not None
            else None,
            user_continuous_recording_url=user_continuous_recording_url,
            user_continuous_duration_seconds=user_continuous_duration_seconds,
            user_continuous_transcript=user_continuous_transcript,
            ai_feedback=ai_feedback,
            ai_review=ShadowingAiReviewState(
                status="completed"
                if ai_evaluation and ai_evaluation.status.value == "completed"
                else "failed"
                if ai_evaluation and ai_evaluation.status.value == "failed"
                else "not_requested",
                review_id=ai_evaluation.id if ai_evaluation else None,
                feedback_review_id=ai_evaluation.id if ai_evaluation else None,
            ),
            transcription=transcription_progress(
                ["completed" if user_continuous_transcript else "not_requested"]
                if is_continuous and continuous_rec
                else [segment.transcription_status for segment in review_segments],
                total=1 if is_continuous else total_count,
            ),
            recorded_segments=sum(segment.recorded for segment in review_segments),
            review_revision=attempt.review_revision,
            segments=review_segments,
        )

    async def get_in_progress_attempt(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
    ) -> ShadowingResumeResponse:
        row = await self.repository.get_latest_in_progress_attempt(
            user_id=user_id,
            content_id=content_id,
        )
        if row is None:
            raise NotFoundError("In-progress Shadowing attempt not found")

        attempt, content = row
        total_attempts = await self.repository.get_total_attempt_count(
            user_id=user_id,
            content_id=content_id,
        )

        return await self._build_resume_response(
            attempt=attempt,
            content=content,
            total_attempts=total_attempts,
        )

    async def get_attempt_practice(
        self,
        *,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
    ) -> ShadowingAttemptPracticeResponse:
        row = await self.repository.get_attempt_with_content(attempt_id)
        if row is None:
            raise ShadowingAttemptNotFoundError()

        attempt, content = row
        if attempt.user_id != user_id:
            raise ForbiddenError()
        if attempt.status != AttemptStatus.IN_PROGRESS:
            raise ShadowingAttemptNotInProgressError()
        if content.status != ContentStatus.PUBLISHED:
            raise ShadowingContentNotFoundError()

        total_attempts = await self.repository.get_total_attempt_count(
            user_id=user_id,
            content_id=content.id,
        )
        resume = await self._build_resume_response(
            attempt=attempt,
            content=content,
            total_attempts=total_attempts,
        )
        snapshot = (attempt.answer_payload or {}).get("content_snapshot")
        rows = await ShadowingReviewRepository(self.repository.session).get_segments(attempt.id)
        detail = (
            self._content_detail(content)
            if not isinstance(snapshot, dict)
            else ShadowingContentDetail.model_validate(
                {
                    "id": content.id,
                    "title": snapshot.get("title", content.title),
                    "description": content.short_description,
                    "content_type": content.content_type,
                    "difficulty": snapshot.get("difficulty", content.difficulty),
                    "topic": content.topic,
                    "duration_seconds": snapshot["audio_duration_ms"] / 1000
                    if isinstance(snapshot.get("audio_duration_ms"), int)
                    else None,
                    "audio_url": snapshot.get("audio_url"),
                    "published_at": content.published_at,
                    "transcript": [
                        {
                            "script": segment.script,
                            "start_time_ms": segment.start_time_ms,
                            "end_time_ms": segment.end_time_ms,
                        }
                        for segment in rows
                    ],
                }
            )
        )
        if not detail.audio_url:
            raise ShadowingContentUnavailableError()
        return ShadowingAttemptPracticeResponse(
            content=detail,
            attempt=resume,
        )

    async def _build_resume_response(
        self,
        *,
        attempt: ExerciseAttempt,
        content: LearningContent,
        total_attempts: int,
    ) -> ShadowingResumeResponse:

        segments = await ShadowingReviewService(
            ShadowingReviewRepository(self.repository.session), self.storage_service
        ).ensure_snapshot(attempt, content)
        await self.repository.session.commit()
        total_count = len(segments)
        recordings = await self.repository.get_recordings_by_attempt(attempt.id)
        recordings_by_id = {str(r.id): r for r in recordings}

        mode_str = (attempt.answer_payload or {}).get("mode")
        is_continuous = mode_str == ShadowingMode.CONTINUOUS.value or "continuous_recording" in (
            attempt.answer_payload or {}
        )
        mode = ShadowingMode.CONTINUOUS if is_continuous else ShadowingMode.SEGMENTED

        continuous_summary: ShadowingContinuousRecordingSummary | None = None
        if is_continuous:
            cont_data = (attempt.answer_payload or {}).get("continuous_recording", {})
            if isinstance(cont_data, dict) and "recording_id" in cont_data:
                with contextlib.suppress(Exception):
                    rec_id = uuid.UUID(str(cont_data["recording_id"]))
                    storage_key = str(cont_data.get("storage_key", ""))
                    if not storage_key and str(rec_id) in recordings_by_id:
                        storage_key = recordings_by_id[str(rec_id)].storage_key
                    playback_url = (
                        self.storage_service.get_playback_url(storage_key) if storage_key else None
                    )
                    continuous_summary = ShadowingContinuousRecordingSummary(
                        recording_id=rec_id,
                        storage_key=storage_key,
                        playback_url=playback_url,
                        duration_seconds=int(cont_data.get("duration_seconds", 0)),
                        created_at=attempt.started_at,
                    )
            elif recordings:
                last_rec = recordings[-1]
                storage_key = last_rec.storage_key
                playback_url = (
                    self.storage_service.get_playback_url(storage_key) if storage_key else None
                )
                continuous_summary = ShadowingContinuousRecordingSummary(
                    recording_id=last_rec.id,
                    storage_key=storage_key,
                    playback_url=playback_url,
                    duration_seconds=int((last_rec.duration_ms or 0) // 1000),
                    created_at=last_rec.created_at,
                )

        raw_payload_segments = (attempt.answer_payload or {}).get("segments")
        payload_segments = raw_payload_segments if isinstance(raw_payload_segments, list) else []

        recorded_summaries: list[ShadowingRecordedSegmentSummary] = []
        for seg in payload_segments:
            if isinstance(seg, dict) and "segment_id" in seg and "recording_id" in seg:
                try:
                    rec_id = uuid.UUID(str(seg["recording_id"]))
                    dur_s = int(seg.get("duration_seconds", 0))
                    storage_key = str(seg.get("storage_key", ""))
                    if not storage_key and str(rec_id) in recordings_by_id:
                        storage_key = recordings_by_id[str(rec_id)].storage_key
                    playback_url = (
                        self.storage_service.get_playback_url(storage_key) if storage_key else None
                    )
                    recorded_summaries.append(
                        ShadowingRecordedSegmentSummary(
                            segment_id=str(seg["segment_id"]),
                            recording_id=rec_id,
                            duration_seconds=dur_s,
                            storage_key=storage_key or None,
                            playback_url=playback_url,
                            created_at=attempt.started_at,
                        )
                    )
                except Exception:
                    continue

        return ShadowingResumeResponse(
            attempt_id=attempt.id,
            content_id=content.id,
            attempt_number=attempt.attempt_number,
            mode=mode,
            total_segments=total_count,
            recorded_segments=recorded_summaries,
            continuous_recording=continuous_summary,
            total_attempts=total_attempts,
        )

    async def _get_or_create_attempt(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        attempt_id: uuid.UUID | None,
        requested_mode: ShadowingMode,
    ) -> ExerciseAttempt:
        if attempt_id is None:
            await self.repository.lock_user(user_id)
            existing_row = await self.repository.get_latest_in_progress_attempt(
                user_id=user_id,
                content_id=content_id,
            )
            if existing_row is not None:
                raise AttemptAlreadyInProgressError(
                    attempt_id=existing_row[0].id,
                    practice_method=PracticeMethod.SHADOWING,
                )
            attempt_number = await self.repository.get_next_attempt_number(
                user_id=user_id,
                content_id=content_id,
            )
            return await self.repository.create_attempt(
                user_id=user_id,
                content_id=content_id,
                attempt_number=attempt_number,
                answer_payload={"mode": requested_mode.value},
            )

        attempt = await self.repository.get_attempt(attempt_id)
        if attempt is None or attempt.content_id != content_id:
            raise ShadowingAttemptNotFoundError()
        if attempt.user_id != user_id:
            raise ForbiddenError()
        if attempt.status != AttemptStatus.IN_PROGRESS:
            raise ShadowingAttemptNotInProgressError()

        stored_mode = (attempt.answer_payload or {}).get("mode")
        if isinstance(stored_mode, str) and stored_mode != requested_mode.value:
            raise ShadowingAttemptModeMismatchError(
                attempt_mode=stored_mode,
                requested_mode=requested_mode.value,
            )
        return attempt

    def _content_detail(self, content: LearningContent) -> ShadowingContentDetail:
        transcript = self._validated_transcript(content)
        return ShadowingContentDetail(
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
            transcript=transcript,
        )

    @staticmethod
    def _validated_transcript(content: LearningContent) -> list[TranscriptSegment]:
        if not content.transcript_ja:
            raise ShadowingContentUnavailableError()

        try:
            segments = [
                TranscriptSegment.model_validate(segment) for segment in content.transcript_ja
            ]
            if any(
                not segment.script.strip() or segment.end_time_ms <= segment.start_time_ms
                for segment in segments
            ):
                raise ShadowingContentUnavailableError()
            return segments
        except ValidationError as exc:
            raise ShadowingContentUnavailableError() from exc

    @staticmethod
    def _is_valid_segment(transcript_ja: list[dict[str, Any]] | None, segment_id: str) -> bool:
        if not transcript_ja:
            return False

        try:
            index = int(segment_id)
        except ValueError:
            return False

        return 0 <= index < len(transcript_ja)
