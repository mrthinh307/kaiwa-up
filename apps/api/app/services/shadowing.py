import uuid
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from fastapi import UploadFile

from app.exceptions import ForbiddenError, NotFoundError
from app.exceptions.shadowing import (
    ShadowingAttemptNotFoundError,
    ShadowingAudioTooLargeError,
    ShadowingContentNotFoundError,
    ShadowingInvalidAudioError,
    ShadowingInvalidSegmentError,
)
from app.models.attempt import ExerciseAttempt
from app.models.enums import AttemptStatus, ContentType
from app.repositories.gamification import GamificationRepository
from app.repositories.recording import RecordingRepository
from app.schemas.shadowing import (
    ShadowingAttemptReviewResponse,
    ShadowingRecordingPlaybackResponse,
    ShadowingRecordSegmentResponse,
    ShadowingSegmentReviewItem,
    ShadowingSubmitResponse,
    ShadowingUserProgressSummary,
)
from app.services.leveling import level_for_total_exp, minimum_exp_for_level
from app.services.storage import StorageService
from app.utils.datetime_utils import utc_now

MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024  # 10MB


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
    ) -> None:
        self.repository = repository
        self.storage_service = storage_service or StorageService()

    async def record_segment(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        segment_id: str,
        audio_file: UploadFile,
        attempt_id: uuid.UUID | None = None,
    ) -> ShadowingRecordSegmentResponse:
        content = await self.repository.get_shadowing_content(content_id)
        if content is None:
            raise ShadowingContentNotFoundError()

        if not self._is_valid_segment(content.transcript_ja, segment_id):
            raise ShadowingInvalidSegmentError()

        file_content = await audio_file.read()
        await audio_file.seek(0)

        if not file_content:
            raise ShadowingInvalidAudioError()
        if len(file_content) > MAX_AUDIO_SIZE_BYTES:
            raise ShadowingAudioTooLargeError()

        try:
            attempt: ExerciseAttempt
            if attempt_id is None:
                await self.repository.lock_user(user_id)
                attempt_number = await self.repository.get_next_attempt_number(
                    user_id=user_id,
                    content_id=content_id,
                )
                attempt = await self.repository.create_attempt(
                    user_id=user_id,
                    content_id=content_id,
                    attempt_number=attempt_number,
                )
            else:
                existing_attempt = await self.repository.get_attempt(attempt_id)
                if existing_attempt is None or existing_attempt.content_id != content_id:
                    raise NotFoundError("Attempt not found")
                if existing_attempt.user_id != user_id:
                    raise ForbiddenError()
                attempt = existing_attempt

            storage_key, duration_seconds = await self.storage_service.save_audio(
                user_id=user_id,
                attempt_id=attempt.id,
                file=audio_file,
            )

            recording = await self.repository.create_recording(
                user_id=user_id,
                attempt_id=attempt.id,
                storage_key=storage_key,
                duration_ms=duration_seconds * 1000,
                mime_type=audio_file.content_type,
            )

            raw_segments = (attempt.answer_payload or {}).get("segments")
            existing_segments = raw_segments if isinstance(raw_segments, list) else []
            segments_by_id = {
                str(s.get("segment_id")): s
                for s in existing_segments
                if isinstance(s, dict) and "segment_id" in s
            }
            segments_by_id[segment_id] = {
                "segment_id": segment_id,
                "recording_id": str(recording.id),
                "storage_key": storage_key,
                "duration_seconds": duration_seconds,
                "duration_ms": duration_seconds * 1000,
            }
            new_payload = dict(attempt.answer_payload or {})
            new_payload["segments"] = list(segments_by_id.values())
            await self.repository.update_answer_payload(attempt, new_payload)

            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            raise

        return ShadowingRecordSegmentResponse(
            recording_id=recording.id,
            attempt_id=attempt.id,
            segment_id=segment_id,
            storage_key=recording.storage_key,
            duration_seconds=duration_seconds,
            created_at=recording.created_at,
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
    ) -> ShadowingSubmitResponse:
        try:
            row = await self.repository.get_attempt_for_update(attempt_id)
            if row is None or row[1].content_type != ContentType.SHADOWING_DICTATION:
                raise ShadowingAttemptNotFoundError()

            attempt, content = row
            if attempt.content_id != content_id:
                raise ShadowingAttemptNotFoundError()
            if attempt.user_id != user_id:
                raise ForbiddenError()

            gamification_repo = GamificationRepository(self.repository.session)

            # Idempotency: if already completed, return existing attempt result
            if attempt.status == AttemptStatus.COMPLETED:
                existing_tx = await gamification_repo.find_transaction_by_attempt(attempt_id)
                xp_earned = existing_tx.amount if existing_tx else 0
                progress = await gamification_repo.get_or_create_user_progress(user_id)
                next_level_min_exp = minimum_exp_for_level(progress.current_level + 1)
                exp_to_next = max(0, next_level_min_exp - progress.total_exp)

                return ShadowingSubmitResponse(
                    attempt_id=attempt.id,
                    status=AttemptStatus.COMPLETED,
                    score=float(attempt.score) if attempt.score is not None else 0.0,
                    xp_earned=xp_earned,
                    content_type="shadowing",
                    difficulty=content.difficulty.value,
                    message="Bạn đã hoàn thành bài luyện.",
                    user_progress=ShadowingUserProgressSummary(
                        total_exp=progress.total_exp,
                        current_level=progress.current_level,
                        exp_to_next_level=exp_to_next,
                    ),
                    completed_at=attempt.completed_at or utc_now(),
                )

            transcript_segments = content.transcript_ja or []
            total_count = len(transcript_segments)
            recordings = await self.repository.get_recordings_by_attempt(attempt_id)

            raw_payload_segments = (attempt.answer_payload or {}).get("segments")
            payload_segments = (
                raw_payload_segments if isinstance(raw_payload_segments, list) else []
            )
            valid_segment_ids: set[str] = set()
            for seg in payload_segments:
                if isinstance(seg, dict):
                    dur_s = seg.get("duration_seconds", 0)
                    dur_ms = seg.get("duration_ms", 0)
                    if dur_s >= 2 or dur_ms >= 2000:
                        valid_segment_ids.add(str(seg.get("segment_id")))

            if not valid_segment_ids and recordings:
                for idx, rec in enumerate(recordings):
                    if (rec.duration_ms or 0) >= 2000:
                        valid_segment_ids.add(str(idx))

            completed_count = min(len(valid_segment_ids), total_count)
            score = calculate_shadowing_score(
                completed_count=completed_count, total_count=total_count
            )
            xp_earned = calculate_shadowing_exp(
                base_exp=content.base_exp,
                completed_count=completed_count,
                total_count=total_count,
            )

            completed_at = utc_now()
            updated_payload = dict(attempt.answer_payload or {})
            updated_payload["replay_count"] = replay_count
            updated_payload["completed_segment_count"] = completed_count
            updated_payload["total_segments"] = total_count
            updated_payload["score"] = float(score)

            await self.repository.complete_attempt(
                attempt,
                score=score,
                correct_count=completed_count,
                total_count=total_count,
                answer_payload=updated_payload,
                completed_at=completed_at,
            )

            progress = await gamification_repo.get_or_create_user_progress_for_update(user_id)

            if xp_earned > 0:
                reason = f"Hoàn thành Shadowing: {content.title}"
                await gamification_repo.insert_transaction(
                    user_id=user_id,
                    attempt_id=attempt_id,
                    amount=xp_earned,
                    reason=reason,
                )
                progress.total_exp += xp_earned
                progress.current_level = level_for_total_exp(progress.total_exp)

                prior_completed = await self.repository.count_prior_completed_attempts(
                    user_id=user_id,
                    content_id=content_id,
                    exclude_attempt_id=attempt_id,
                )
                if prior_completed == 0:
                    progress.completed_content_count += 1

            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            raise

        next_level_min_exp = minimum_exp_for_level(progress.current_level + 1)
        exp_to_next = max(0, next_level_min_exp - progress.total_exp)

        return ShadowingSubmitResponse(
            attempt_id=attempt.id,
            status=AttemptStatus.COMPLETED,
            score=float(score),
            xp_earned=xp_earned,
            content_type="shadowing",
            difficulty=content.difficulty.value,
            message="Bạn đã hoàn thành bài luyện.",
            user_progress=ShadowingUserProgressSummary(
                total_exp=progress.total_exp,
                current_level=progress.current_level,
                exp_to_next_level=exp_to_next,
            ),
            completed_at=completed_at,
        )

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

        transcript_segments = content.transcript_ja or []
        total_count = len(transcript_segments)
        recordings = await self.repository.get_recordings_by_attempt(attempt_id)

        raw_payload_segments = (attempt.answer_payload or {}).get("segments")
        payload_segments = raw_payload_segments if isinstance(raw_payload_segments, list) else []
        payload_by_id = {
            str(seg.get("segment_id")): seg
            for seg in payload_segments
            if isinstance(seg, dict) and "segment_id" in seg
        }

        recordings_by_id = {str(rec.id): rec for rec in recordings}

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
            elif index < len(recordings):
                rec = recordings[index]

            is_recorded = False
            rec_uuid = None
            playback_url = None
            duration_s = None

            if rec is not None:
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
                )
            )

        return ShadowingAttemptReviewResponse(
            attempt_id=attempt.id,
            content_id=content.id,
            title=content.title,
            difficulty=content.difficulty.value,
            audio_url=content.audio_url,
            status=attempt.status,
            score=float(attempt.score) if attempt.score is not None else None,
            earned_exp=earned_exp or 0,
            completed_at=attempt.completed_at,
            total_segments=total_count,
            completed_segments=completed_count,
            segments=review_segments,
        )

    @staticmethod
    def _is_valid_segment(transcript_ja: list[dict[str, Any]] | None, segment_id: str) -> bool:
        if not transcript_ja:
            return False

        try:
            index = int(segment_id)
        except ValueError:
            return False

        return 0 <= index < len(transcript_ja)
