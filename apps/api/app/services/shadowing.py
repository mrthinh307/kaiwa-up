import asyncio
import contextlib
import logging
import uuid
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from fastapi import UploadFile

from app.exceptions import AttemptAlreadyInProgressError, ForbiddenError, NotFoundError
from app.exceptions.shadowing import (
    ShadowingAttemptNotFoundError,
    ShadowingAttemptNotInProgressError,
    ShadowingAudioTooLargeError,
    ShadowingContentNotFoundError,
    ShadowingInvalidAudioError,
    ShadowingInvalidSegmentError,
)
from app.integrations.ai.base import AiGateway
from app.models.attempt import ExerciseAttempt, Recording
from app.models.enums import AttemptStatus, ContentType, PracticeMethod
from app.repositories.gamification import GamificationRepository
from app.repositories.recording import RecordingRepository
from app.schemas.shadowing import (
    ShadowingAiFeedback,
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
    ShadowingSubmitResponse,
    ShadowingUserProgressSummary,
)
from app.services.leveling import level_for_total_exp, minimum_exp_for_level
from app.services.storage import StorageService
from app.utils.datetime_utils import utc_now

logger = logging.getLogger(__name__)

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
        ai_gateway: AiGateway | None = None,
    ) -> None:
        self.repository = repository
        self.storage_service = storage_service or StorageService()
        self.ai_gateway = ai_gateway

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
            attempt = await self._get_or_create_attempt(
                user_id=user_id,
                content_id=content_id,
                attempt_id=attempt_id,
            )

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
            new_payload["mode"] = ShadowingMode.SEGMENTED.value
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

    async def record_continuous(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        audio_file: UploadFile,
        duration_seconds: int | None = None,
        attempt_id: uuid.UUID | None = None,
    ) -> ShadowingRecordContinuousResponse:
        content = await self.repository.get_shadowing_content(content_id)
        if content is None:
            raise ShadowingContentNotFoundError()

        file_content = await audio_file.read()
        await audio_file.seek(0)

        if not file_content:
            raise ShadowingInvalidAudioError()
        if len(file_content) > MAX_AUDIO_SIZE_BYTES:
            raise ShadowingAudioTooLargeError()

        try:
            attempt = await self._get_or_create_attempt(
                user_id=user_id,
                content_id=content_id,
                attempt_id=attempt_id,
            )

            storage_key, file_duration_seconds = await self.storage_service.save_audio(
                user_id=user_id,
                attempt_id=attempt.id,
                file=audio_file,
            )

            actual_duration_seconds = (
                duration_seconds
                if duration_seconds is not None and duration_seconds > 0
                else file_duration_seconds
            )

            recording = await self.repository.create_recording(
                user_id=user_id,
                attempt_id=attempt.id,
                storage_key=storage_key,
                duration_ms=actual_duration_seconds * 1000,
                mime_type=audio_file.content_type,
            )

            new_payload = dict(attempt.answer_payload or {})
            new_payload["mode"] = ShadowingMode.CONTINUOUS.value
            new_payload["continuous_recording"] = {
                "recording_id": str(recording.id),
                "storage_key": storage_key,
                "duration_seconds": actual_duration_seconds,
                "duration_ms": actual_duration_seconds * 1000,
            }
            await self.repository.update_answer_payload(attempt, new_payload)

            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            raise

        return ShadowingRecordContinuousResponse(
            recording_id=recording.id,
            attempt_id=attempt.id,
            storage_key=recording.storage_key,
            duration_seconds=actual_duration_seconds,
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

                existing_ai_eval = await self.repository.get_latest_ai_evaluation(attempt_id)
                existing_ai_feedback: ShadowingAiFeedback | None = None
                if existing_ai_eval is not None:
                    details_dict = (
                        existing_ai_eval.details
                        if isinstance(existing_ai_eval.details, dict)
                        else {}
                    )
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
                    existing_ai_feedback = ShadowingAiFeedback(
                        similarity_score=float(existing_ai_eval.similarity_score)
                        if existing_ai_eval.similarity_score is not None
                        else None,
                        fluency_score=float(existing_ai_eval.fluency_score)
                        if existing_ai_eval.fluency_score is not None
                        else None,
                        feedback=existing_ai_eval.feedback,
                        corrections=corrections_list,
                        hints=hints_list,
                        user_transcript=str(details_dict.get("user_transcript"))
                        if details_dict.get("user_transcript")
                        else None,
                    )

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
                    ai_feedback=existing_ai_feedback,
                )

            transcript_segments = content.transcript_ja or []
            total_count = len(transcript_segments)
            recordings = await self.repository.get_recordings_by_attempt(attempt_id)

            mode_str = (attempt.answer_payload or {}).get("mode")
            is_continuous = (
                mode_str == ShadowingMode.CONTINUOUS.value
                or "continuous_recording" in (attempt.answer_payload or {})
            )

            completed_count = 0
            if is_continuous:
                cont_data = (attempt.answer_payload or {}).get("continuous_recording", {})
                rec_duration_sec = (
                    float(cont_data.get("duration_seconds", 0))
                    if isinstance(cont_data, dict)
                    else 0.0
                )
                if rec_duration_sec <= 0 and recordings:
                    rec_duration_sec = float((recordings[0].duration_ms or 0) / 1000)

                total_material_sec = float(
                    (content.audio_duration_ms or (total_count * 5000)) / 1000.0
                )
                ratio = (
                    min(1.0, rec_duration_sec / total_material_sec)
                    if total_material_sec > 0
                    else 0.0
                )
                completed_count = (
                    min(total_count, round(ratio * total_count))
                    if total_count > 0
                    else (1 if rec_duration_sec >= 2 else 0)
                )
            else:
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

            # Official deterministic score and EXP (purely completion based)
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

            # Informational AI evaluation (does NOT affect score or EXP)
            ai_feedback: ShadowingAiFeedback | None = None
            if self.ai_gateway is not None and recordings:
                try:
                    ref_script = " ".join(
                        str(s.get("script", "")) for s in transcript_segments if isinstance(s, dict)
                    ).strip()

                    if is_continuous:
                        cont_data = (attempt.answer_payload or {}).get("continuous_recording", {})
                        continuous_rec: Recording | None = None
                        rec_id_str = (
                            str(cont_data.get("recording_id", ""))
                            if isinstance(cont_data, dict)
                            else ""
                        )
                        storage_key_str = (
                            str(cont_data.get("storage_key", ""))
                            if isinstance(cont_data, dict)
                            else ""
                        )

                        for rec in recordings:
                            if rec_id_str and str(rec.id) == rec_id_str:
                                continuous_rec = rec
                                break
                            if storage_key_str and rec.storage_key == storage_key_str:
                                continuous_rec = rec
                                break

                        if continuous_rec is None and recordings:
                            continuous_rec = recordings[-1]

                        target_storage_key = (
                            continuous_rec.storage_key
                            if continuous_rec
                            else (
                                storage_key_str
                                or (recordings[-1].storage_key if recordings else None)
                            )
                        )

                        if target_storage_key:
                            audio_bytes = await self.storage_service.get_audio_bytes(
                                target_storage_key
                            )
                            prompt_hint = (
                                ref_script[:200] if len(ref_script) > 200 else ref_script
                            ) or None

                            stt_result = await self.ai_gateway.transcribe(
                                audio=audio_bytes,
                                filename="continuous.webm",
                                language="ja",
                                prompt_hint=prompt_hint,
                            )
                            if continuous_rec is not None:
                                await self.repository.update_recording_transcription(
                                    continuous_rec, stt_result.text
                                )

                            recognized_text = stt_result.text.strip()
                            if recognized_text:
                                eval_result = await self.ai_gateway.evaluate_shadowing(
                                    reference_transcript=ref_script,
                                    user_transcript=recognized_text,
                                )
                                await self.repository.create_ai_evaluation(
                                    attempt_id=attempt.id,
                                    recording_id=continuous_rec.id if continuous_rec else None,
                                    similarity_score=Decimal(str(round(eval_result.score, 2))),
                                    feedback=eval_result.feedback,
                                    details={
                                        "corrections": [
                                            c.model_dump() for c in eval_result.corrections
                                        ],
                                        "hints": eval_result.hints,
                                        "is_acceptable": eval_result.is_acceptable,
                                        "user_transcript": recognized_text,
                                    },
                                    completed_at=completed_at,
                                )
                                ai_feedback = ShadowingAiFeedback(
                                    similarity_score=float(eval_result.score),
                                    feedback=eval_result.feedback,
                                    corrections=[
                                        ShadowingCorrection(
                                            original=c.original,
                                            corrected=c.corrected,
                                            reason=c.reason,
                                        )
                                        for c in eval_result.corrections
                                    ],
                                    hints=eval_result.hints,
                                    user_transcript=recognized_text,
                                )
                                updated_payload["continuous_transcript"] = recognized_text
                            else:
                                no_speech_feedback = (
                                    "Không nhận diện được giọng nói trong bản thu âm. "
                                    "Bạn hãy thử phát âm to, rõ ràng hơn và kiểm tra "
                                    "thiết bị micro."
                                )
                                no_speech_hints = [
                                    "Kiểm tra âm lượng micro và khoảng cách thu âm.",
                                    "Phát âm rõ ràng theo câu mẫu tiếng Nhật.",
                                ]
                                await self.repository.create_ai_evaluation(
                                    attempt_id=attempt.id,
                                    recording_id=continuous_rec.id if continuous_rec else None,
                                    similarity_score=Decimal("0.00"),
                                    feedback=no_speech_feedback,
                                    details={
                                        "corrections": [],
                                        "hints": no_speech_hints,
                                        "is_acceptable": False,
                                        "user_transcript": "",
                                    },
                                    completed_at=completed_at,
                                )
                                ai_feedback = ShadowingAiFeedback(
                                    similarity_score=0.0,
                                    feedback=no_speech_feedback,
                                    corrections=[],
                                    hints=no_speech_hints,
                                    user_transcript="",
                                )
                                updated_payload["continuous_transcript"] = ""
                    else:
                        segment_transcripts: dict[str, str] = {}
                        raw_payload_segs = (attempt.answer_payload or {}).get("segments")
                        payload_segs = (
                            raw_payload_segs if isinstance(raw_payload_segs, list) else []
                        )
                        seg_rec_map: dict[str, Recording] = {}
                        for seg in payload_segs:
                            if isinstance(seg, dict) and "segment_id" in seg:
                                seg_id_str = str(seg["segment_id"])
                                rec_id_str = str(seg.get("recording_id", ""))
                                for rec in recordings:
                                    if str(rec.id) == rec_id_str:
                                        seg_rec_map[seg_id_str] = rec
                                        break

                        if not seg_rec_map:
                            for idx, rec in enumerate(recordings):
                                seg_rec_map[str(idx)] = rec

                        async def process_segment(
                            seg_id: str, rec: Recording, ref_text: str
                        ) -> None:
                            try:
                                audio_bytes = await self.storage_service.get_audio_bytes(
                                    rec.storage_key
                                )
                                stt = await self.ai_gateway.transcribe(  # type: ignore[union-attr]
                                    audio=audio_bytes,
                                    filename=f"segment_{seg_id}.webm",
                                    language="ja",
                                    prompt_hint=ref_text or None,
                                )
                                await self.repository.update_recording_transcription(rec, stt.text)
                                segment_transcripts[seg_id] = stt.text
                            except Exception as exc:
                                logger.warning(
                                    "STT transcription failed for segment %s: %s",
                                    seg_id,
                                    exc,
                                )

                        tasks = []
                        for idx, seg_data in enumerate(transcript_segments):
                            seg_id = str(idx)
                            ref_text = (
                                str(seg_data.get("script", ""))
                                if isinstance(seg_data, dict)
                                else ""
                            )
                            if seg_id in seg_rec_map:
                                tasks.append(process_segment(seg_id, seg_rec_map[seg_id], ref_text))

                        if tasks:
                            await asyncio.gather(*tasks, return_exceptions=True)

                        combined_user_transcript = " ".join(
                            segment_transcripts.get(str(i), "")
                            for i in range(len(transcript_segments))
                        ).strip()

                        if combined_user_transcript:
                            eval_result = await self.ai_gateway.evaluate_shadowing(
                                reference_transcript=ref_script,
                                user_transcript=combined_user_transcript,
                            )
                            await self.repository.create_ai_evaluation(
                                attempt_id=attempt.id,
                                similarity_score=Decimal(str(round(eval_result.score, 2))),
                                feedback=eval_result.feedback,
                                details={
                                    "corrections": [
                                        c.model_dump() for c in eval_result.corrections
                                    ],
                                    "hints": eval_result.hints,
                                    "is_acceptable": eval_result.is_acceptable,
                                    "user_transcript": combined_user_transcript,
                                    "segment_transcripts": segment_transcripts,
                                },
                                completed_at=completed_at,
                            )
                            ai_feedback = ShadowingAiFeedback(
                                similarity_score=float(eval_result.score),
                                feedback=eval_result.feedback,
                                corrections=[
                                    ShadowingCorrection(
                                        original=c.original,
                                        corrected=c.corrected,
                                        reason=c.reason,
                                    )
                                    for c in eval_result.corrections
                                ],
                                hints=eval_result.hints,
                                user_transcript=combined_user_transcript,
                            )
                            updated_payload["segment_transcripts"] = segment_transcripts
                except Exception as exc:
                    logger.warning("Shadowing informational AI evaluation failed: %s", exc)

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
            ai_feedback=ai_feedback,
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
        if ai_evaluation is not None:
            details_dict = ai_evaluation.details if isinstance(ai_evaluation.details, dict) else {}
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
            elif not is_continuous and index < len(recordings):
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
                    user_transcript=user_transcript_seg,
                )
            )

        if is_continuous:
            completed_count = attempt.correct_count or total_count

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

        return ShadowingAttemptReviewResponse(
            attempt_id=attempt.id,
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

        transcript_segments = content.transcript_ja or []
        total_count = len(transcript_segments)

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
                    continuous_summary = ShadowingContinuousRecordingSummary(
                        recording_id=uuid.UUID(str(cont_data["recording_id"])),
                        storage_key=str(cont_data.get("storage_key", "")),
                        duration_seconds=int(cont_data.get("duration_seconds", 0)),
                        created_at=attempt.started_at,
                    )

        raw_payload_segments = (attempt.answer_payload or {}).get("segments")
        payload_segments = raw_payload_segments if isinstance(raw_payload_segments, list) else []

        recorded_summaries: list[ShadowingRecordedSegmentSummary] = []
        for seg in payload_segments:
            if isinstance(seg, dict) and "segment_id" in seg and "recording_id" in seg:
                try:
                    rec_id = uuid.UUID(str(seg["recording_id"]))
                    dur_s = int(seg.get("duration_seconds", 0))
                    recorded_summaries.append(
                        ShadowingRecordedSegmentSummary(
                            segment_id=str(seg["segment_id"]),
                            recording_id=rec_id,
                            duration_seconds=dur_s,
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
            )

        attempt = await self.repository.get_attempt(attempt_id)
        if attempt is None or attempt.content_id != content_id:
            raise ShadowingAttemptNotFoundError()
        if attempt.user_id != user_id:
            raise ForbiddenError()
        if attempt.status != AttemptStatus.IN_PROGRESS:
            raise ShadowingAttemptNotInProgressError()
        return attempt

    @staticmethod
    def _is_valid_segment(transcript_ja: list[dict[str, Any]] | None, segment_id: str) -> bool:
        if not transcript_ja:
            return False

        try:
            index = int(segment_id)
        except ValueError:
            return False

        return 0 <= index < len(transcript_ja)
