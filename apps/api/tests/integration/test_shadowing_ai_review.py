"""Opt-in evaluations are queued, cached and published without retranscribing audio."""

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.integrations.ai.providers.fake import FakeAiGateway
from app.integrations.ai.shadowing_contracts import (
    ShadowingEvaluationInput,
    ShadowingEvaluationResult,
    ShadowingSegmentScore,
    ShadowingSummaryInput,
    ShadowingSummaryResult,
)
from app.models.attempt import AiEvaluation, ExerciseAttempt, Recording
from app.models.enums import AiEvaluationStatus, AttemptStatus
from app.models.gamification import XpTransaction
from app.models.shadowing import ShadowingAttemptSegment, ShadowingJob
from app.repositories.recording import RecordingRepository
from app.services.shadowing import ShadowingService
from app.services.shadowing_comparison import compare_shadowing_segment
from app.services.storage import StorageService
from app.workers.shadowing import ShadowingWorker
from tests.conftest import isolated_shadowing_sessions
from tests.integration.test_shadowing_submission import (
    SubmissionExample,
    prepare_submission,
    submission_client,
)


@pytest_asyncio.fixture(scope="module")
async def review_sessions() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    async with isolated_shadowing_sessions() as factory:
        yield factory


class ReviewGateway(FakeAiGateway):
    def __init__(self) -> None:
        self.batches = 0
        self.summaries = 0

    async def evaluate_shadowing_batch(
        self, *, payload: ShadowingEvaluationInput
    ) -> ShadowingEvaluationResult:
        self.batches += 1
        return ShadowingEvaluationResult(
            segments=[
                ShadowingSegmentScore(segment_index=segment.segment_index, score=90)
                for segment in payload.segments
            ],
            feedback="Nhận xét từ transcript.",
            provider="fake",
            model="fake-review",
        )

    async def summarize_shadowing_feedback(
        self, *, payload: ShadowingSummaryInput
    ) -> ShadowingSummaryResult:
        self.summaries += 1
        return ShadowingSummaryResult(
            feedback="Tổng hợp từ tất cả các câu đã đối chiếu.",
            provider="fake",
            model="fake-review",
        )


class NoAudioStorage(StorageService):
    def __init__(self) -> None:
        pass

    async def get_audio_bytes(self, storage_key: str) -> bytes:
        raise AssertionError("Requesting AI feedback must reuse completed transcripts")


async def ready_example(
    factory: async_sessionmaker[AsyncSession], *, count: int = 2
) -> SubmissionExample:
    example = await prepare_submission(factory, count=count)
    async with factory() as session:
        await ShadowingService(RecordingRepository(session)).submit_attempt(
            user_id=example.user.id, content_id=example.content.id, attempt_id=example.attempt.id
        )
        segments = list(
            await session.scalars(
                select(ShadowingAttemptSegment).where(
                    ShadowingAttemptSegment.attempt_id == example.attempt.id
                )
            )
        )
        for segment in segments:
            segment.transcription_status = "completed"
            segment.transcript = segment.script
            segment.comparison = compare_shadowing_segment(
                segment.script, segment.script
            ).model_dump(mode="json")
            recording = await session.get(Recording, segment.recording_id)
            assert recording is not None
            recording.transcription_ja = segment.script
        await session.execute(
            update(ShadowingJob)
            .where(ShadowingJob.attempt_id == example.attempt.id)
            .values(status="completed")
        )
        await session.commit()
    return example


async def test_ai_is_only_created_on_request_and_cached_after_completion(
    review_sessions: async_sessionmaker[AsyncSession],
) -> None:
    example = await ready_example(review_sessions)
    gateway = ReviewGateway()
    worker = ShadowingWorker(review_sessions, gateway, NoAudioStorage(), Settings())
    async with submission_client(review_sessions, example) as client:
        path = f"/api/v1/shadowing/attempts/{example.attempt.id}"
        before = (await client.get(f"{path}/review")).json()
        assert before["ai_review"]["status"] == "not_requested"
        request = {"review_revision": before["review_revision"]}
        accepted = await client.post(f"{path}/ai-reviews", json=request)
        assert accepted.status_code == 202
        replayed = await client.post(f"{path}/ai-reviews", json=request)
        assert replayed.status_code in (200, 202)
        assert (
            accepted.json()["ai_review"]["review_id"] == replayed.json()["ai_review"]["review_id"]
        )
        assert await worker.run_once()
        after = (await client.get(f"{path}/review")).json()
        assert after["ai_review"]["status"] == "completed"
        assert after["ai_feedback"]["similarity_score"] == 90
        assert after["score"] == before["score"] and after["earned_exp"] == before["earned_exp"]
        cached = await client.post(
            f"{path}/ai-reviews", json={"review_revision": after["review_revision"]}
        )
        assert cached.status_code == 200
        assert not await worker.run_once()
    assert gateway.batches == 1 and gateway.summaries == 0
    async with review_sessions() as session:
        assert (
            await session.scalar(
                select(func.count())
                .select_from(AiEvaluation)
                .where(AiEvaluation.attempt_id == example.attempt.id)
            )
            == 1
        )


async def test_malformed_active_review_id_falls_back_to_completed_feedback(
    review_sessions: async_sessionmaker[AsyncSession],
) -> None:
    example = await ready_example(review_sessions)
    async with review_sessions() as session:
        attempt = await session.get(ExerciseAttempt, example.attempt.id)
        assert attempt is not None
        payload = dict(attempt.answer_payload or {})
        payload["active_ai_review_id"] = "not-a-uuid"
        attempt.answer_payload = payload
        session.add(
            AiEvaluation(
                attempt_id=attempt.id,
                status=AiEvaluationStatus.COMPLETED,
                similarity_score=88,
                feedback="Saved feedback",
                details={},
            )
        )
        await session.commit()

    async with submission_client(review_sessions, example) as client:
        response = await client.get(f"/api/v1/shadowing/attempts/{example.attempt.id}/review")

    assert response.status_code == 200
    assert response.json()["ai_feedback"]["feedback"] == "Saved feedback"


async def test_multiple_batches_are_summarized_once_after_every_batch_completes(
    review_sessions: async_sessionmaker[AsyncSession],
) -> None:
    example = await ready_example(review_sessions, count=21)
    gateway = ReviewGateway()
    worker = ShadowingWorker(review_sessions, gateway, NoAudioStorage(), Settings())
    async with submission_client(review_sessions, example) as client:
        path = f"/api/v1/shadowing/attempts/{example.attempt.id}"
        before = (await client.get(f"{path}/review")).json()
        accepted = await client.post(
            f"{path}/ai-reviews", json={"review_revision": before["review_revision"]}
        )
        assert accepted.status_code == 202
        assert await worker.run_once()
        midway = (await client.get(f"{path}/review")).json()
        assert midway["ai_feedback"] is None
        assert await worker.run_once()
        async with review_sessions() as session:
            saved_jobs = list(
                await session.scalars(
                    select(ShadowingJob).where(ShadowingJob.attempt_id == example.attempt.id)
                )
            )
            assert any(job.kind == "summarize_feedback" for job in saved_jobs), [
                (job.kind, job.status) for job in saved_jobs
            ]
        assert await worker.run_once()
        after = (await client.get(f"{path}/review")).json()
        assert after["ai_review"]["status"] == "completed"
        assert after["ai_review"]["evaluated_segments"] == 21
    assert gateway.batches == 2 and gateway.summaries == 1


async def test_stale_or_pending_transcripts_do_not_start_a_new_evaluation(
    review_sessions: async_sessionmaker[AsyncSession],
) -> None:
    example = await ready_example(review_sessions)
    async with submission_client(review_sessions, example) as client:
        path = f"/api/v1/shadowing/attempts/{example.attempt.id}"
        stale = await client.post(f"{path}/ai-reviews", json={"review_revision": 0})
        assert stale.status_code == 409
        async with review_sessions() as session:
            await session.execute(
                update(ShadowingJob)
                .where(ShadowingJob.attempt_id == example.attempt.id)
                .values(status="queued")
            )
            await session.commit()
        before = (await client.get(f"{path}/review")).json()
        pending = await client.post(
            f"{path}/ai-reviews", json={"review_revision": before["review_revision"]}
        )
        assert pending.status_code == 409
        async with review_sessions() as session:
            await session.execute(
                update(ShadowingJob)
                .where(ShadowingJob.attempt_id == example.attempt.id)
                .values(status="completed")
            )
            await session.commit()
        async with review_sessions() as session:
            assert (
                await session.scalar(
                    select(func.count())
                    .select_from(AiEvaluation)
                    .where(AiEvaluation.attempt_id == example.attempt.id)
                )
                == 0
            )


async def test_partial_review_requires_consent_and_counts_silence_as_zero(
    review_sessions: async_sessionmaker[AsyncSession],
) -> None:
    example = await ready_example(review_sessions, count=3)
    async with review_sessions() as session:
        rows = list(
            await session.scalars(
                select(ShadowingAttemptSegment)
                .where(ShadowingAttemptSegment.attempt_id == example.attempt.id)
                .order_by(ShadowingAttemptSegment.segment_index)
            )
        )
        rows[1].transcription_status = "no_speech"
        rows[1].transcript = ""
        rows[1].comparison = compare_shadowing_segment(rows[1].script, "").model_dump(mode="json")
        rows[2].transcription_status = "failed"
        rows[2].transcript = None
        rows[2].comparison = None
        await session.execute(
            update(ShadowingJob)
            .where(ShadowingJob.recording_id == rows[2].recording_id)
            .values(status="failed", error_code="shadowing_stt_timeout")
        )
        await session.commit()
    gateway = ReviewGateway()
    worker = ShadowingWorker(review_sessions, gateway, NoAudioStorage(), Settings())
    async with submission_client(review_sessions, example) as client:
        path = f"/api/v1/shadowing/attempts/{example.attempt.id}"
        before = (await client.get(f"{path}/review")).json()
        request = {"review_revision": before["review_revision"]}
        rejected = await client.post(f"{path}/ai-reviews", json=request)
        assert rejected.status_code == 409
        accepted = await client.post(f"{path}/ai-reviews", json={**request, "allow_partial": True})
        assert accepted.status_code == 202
        assert await worker.run_once()
        reviewed = (await client.get(f"{path}/review")).json()
        assert reviewed["ai_review"]["status"] == "completed"
        assert reviewed["ai_feedback"]["similarity_score"] == 45
        assert reviewed["ai_feedback"]["coverage"]["failed"] == 1
        assert reviewed["ai_feedback"]["coverage"]["no_speech"] == 1
        assert reviewed["earned_exp"] == before["earned_exp"]
    assert gateway.batches == 1


async def test_daily_ai_quota_rejects_new_work_without_changing_exp(
    review_sessions: async_sessionmaker[AsyncSession],
) -> None:
    example = await ready_example(review_sessions)
    async with review_sessions() as session:
        session.add_all(
            AiEvaluation(
                attempt_id=example.attempt.id,
                review_fingerprint=f"previous-input-{index}",
                status=AiEvaluationStatus.COMPLETED,
                details={},
            )
            for index in range(3)
        )
        await session.commit()
    async with submission_client(review_sessions, example) as client:
        path = f"/api/v1/shadowing/attempts/{example.attempt.id}"
        before = (await client.get(f"{path}/review")).json()
        response = await client.post(
            f"{path}/ai-reviews", json={"review_revision": before["review_revision"]}
        )
        assert response.status_code == 429
        after = (await client.get(f"{path}/review")).json()
        assert after["earned_exp"] == before["earned_exp"]
        assert after["ai_review"] == before["ai_review"]
    async with review_sessions() as session:
        jobs = await session.scalars(
            select(ShadowingJob).where(ShadowingJob.attempt_id == example.attempt.id)
        )
        assert all(job.kind == "transcribe_recording" for job in jobs)


@pytest.mark.parametrize("mode", ["segmented", "continuous"])
@pytest.mark.parametrize("has_feedback", [False, True])
async def test_legacy_result_preserves_scores_without_creating_work(
    review_sessions: async_sessionmaker[AsyncSession], mode: str, has_feedback: bool
) -> None:
    example = await prepare_submission(review_sessions)
    async with review_sessions() as session:
        attempt = await session.get(ExerciseAttempt, example.attempt.id)
        assert attempt is not None
        attempt.status = AttemptStatus.COMPLETED
        attempt.score = 37
        attempt.correct_count = 0 if mode == "continuous" else 2
        attempt.total_count = 2
        payload = dict(attempt.answer_payload)
        payload["mode"] = mode
        if mode == "continuous":
            payload["continuous_recording"] = {
                "recording_id": str(example.recordings[0].id),
                "storage_key": example.recordings[0].storage_key,
                "duration_seconds": 3,
            }
        attempt.answer_payload = payload
        session.add(XpTransaction(user_id=example.user.id, attempt_id=attempt.id, amount=17))
        if has_feedback:
            session.add(
                AiEvaluation(
                    attempt_id=attempt.id,
                    status=AiEvaluationStatus.COMPLETED,
                    similarity_score=42,
                    feedback="Historical feedback",
                    details={},
                )
            )
        await session.commit()
    async with submission_client(review_sessions, example) as client:
        for _ in range(2):
            response = await client.get(f"/api/v1/shadowing/attempts/{example.attempt.id}/review")
            assert response.status_code == 200
            result = response.json()
            assert result["reference_version"] == "legacy_reference_unversioned"
            assert result["score"] == 37 and result["earned_exp"] == 17
            if mode == "continuous":
                assert result["completed_segments"] == 0
            if has_feedback:
                assert result["ai_feedback"]["similarity_score"] == 42
            else:
                assert result["ai_feedback"] is None
    async with review_sessions() as session:
        assert (
            await session.scalar(
                select(func.count())
                .select_from(ShadowingJob)
                .where(ShadowingJob.attempt_id == example.attempt.id)
            )
            == 0
        )
        attempt = await session.get(ExerciseAttempt, example.attempt.id)
        assert attempt is not None and "schema_version" not in attempt.answer_payload
