"""Processing and recovery cross real commits; only external audio/STT are simulated."""

import asyncio
from collections.abc import AsyncIterator
from datetime import timedelta

import pytest
import pytest_asyncio
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.exceptions.ai import AiTimeoutError
from app.integrations.ai.contracts import TranscriptionResult
from app.integrations.ai.providers.fake import FakeAiGateway
from app.models.attempt import Recording
from app.models.shadowing import ShadowingJob
from app.repositories.recording import RecordingRepository
from app.services.shadowing import ShadowingService
from app.services.storage import StorageService
from app.utils.datetime_utils import utc_now
from app.workers.shadowing import ShadowingWorker
from tests.conftest import isolated_shadowing_sessions
from tests.integration.test_shadowing_submission import (
    SubmissionExample,
    prepare_submission,
    submission_client,
)


@pytest_asyncio.fixture(scope="module")
async def worker_sessions() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    async with isolated_shadowing_sessions() as factory:
        yield factory


class MemorySpeechStorage(StorageService):
    def __init__(self, example: SubmissionExample, *, text: str = "こんにちは0") -> None:
        self.audio = {recording.storage_key: text.encode() for recording in example.recordings}

    async def get_audio_bytes(self, storage_key: str) -> bytes:
        return self.audio[storage_key]


class RecordingSpeechGateway(FakeAiGateway):
    def __init__(self) -> None:
        self.calls = 0
        self.entered = asyncio.Event()
        self.release = asyncio.Event()
        self.release.set()

    async def transcribe(
        self, *, audio: bytes, filename: str, language: str, prompt_hint: str | None = None
    ) -> TranscriptionResult:
        self.calls += 1
        self.entered.set()
        await self.release.wait()
        assert language == "ja" and prompt_hint is None
        if audio == b"timeout":
            raise AiTimeoutError()
        return TranscriptionResult(text=audio.decode(), language="ja")


async def submit(factory: async_sessionmaker[AsyncSession], example: SubmissionExample) -> None:
    async with factory() as session:
        await ShadowingService(RecordingRepository(session)).submit_attempt(
            user_id=example.user.id, content_id=example.content.id, attempt_id=example.attempt.id
        )


async def test_stt_result_is_published_without_ai_or_another_submission(
    worker_sessions: async_sessionmaker[AsyncSession],
) -> None:
    example = await prepare_submission(worker_sessions, count=1)
    await submit(worker_sessions, example)
    gateway = RecordingSpeechGateway()
    worker = ShadowingWorker(worker_sessions, gateway, MemorySpeechStorage(example), Settings())

    assert await worker.run_once()
    async with worker_sessions() as session:
        result = await ShadowingService(RecordingRepository(session)).get_attempt_review(
            user_id=example.user.id, attempt_id=example.attempt.id
        )
        assert result.transcription.completed == 1
        assert result.transcription.queued == 0
        assert result.segments[0].user_transcript == "こんにちは0"
        assert result.segments[0].text_match_score == 100
        assert result.score == 100 and result.earned_exp == 50
        assert result.ai_feedback is None and result.ai_review.status == "not_requested"
        assert result.review_revision == 2
    assert gateway.calls == 1
    assert not await worker.run_once()


@pytest.mark.parametrize(
    ("text", "state", "score"), [("", "no_speech", 0), ("timeout", "failed", None)]
)
async def test_silence_and_provider_failure_have_different_results(
    worker_sessions: async_sessionmaker[AsyncSession], text: str, state: str, score: float | None
) -> None:
    example = await prepare_submission(worker_sessions, count=1)
    await submit(worker_sessions, example)
    async with worker_sessions() as session:
        await session.execute(
            update(ShadowingJob)
            .where(ShadowingJob.attempt_id == example.attempt.id)
            .values(max_attempts=1)
        )
        await session.commit()
    worker = ShadowingWorker(
        worker_sessions,
        RecordingSpeechGateway(),
        MemorySpeechStorage(example, text=text),
        Settings(),
    )
    assert await worker.run_once()
    async with worker_sessions() as session:
        result = await ShadowingService(RecordingRepository(session)).get_attempt_review(
            user_id=example.user.id, attempt_id=example.attempt.id
        )
        assert result.segments[0].transcription_status == state
        assert result.segments[0].text_match_score == score
        assert result.score == 100 and result.earned_exp == 50


async def test_cancelled_worker_leaves_recoverable_work_and_restart_publishes_once(
    worker_sessions: async_sessionmaker[AsyncSession],
) -> None:
    example = await prepare_submission(worker_sessions, count=1)
    await submit(worker_sessions, example)
    gateway = RecordingSpeechGateway()
    gateway.release.clear()
    worker = ShadowingWorker(worker_sessions, gateway, MemorySpeechStorage(example), Settings())
    running = asyncio.create_task(worker.run_once())
    await asyncio.wait_for(gateway.entered.wait(), timeout=15)
    running.cancel()
    with pytest.raises(asyncio.CancelledError):
        await running
    async with worker_sessions() as session:
        await session.execute(
            update(ShadowingJob)
            .where(ShadowingJob.attempt_id == example.attempt.id)
            .values(locked_until=utc_now() - timedelta(seconds=1))
        )
        await session.commit()
    gateway.release.set()
    restarted = ShadowingWorker(worker_sessions, gateway, MemorySpeechStorage(example), Settings())
    assert await restarted.run_once()
    async with worker_sessions() as session:
        job = await session.scalar(
            select(ShadowingJob).where(ShadowingJob.attempt_id == example.attempt.id)
        )
        assert job is not None and job.status == "completed" and job.attempt_count == 2
        recording = await session.get(Recording, example.recordings[0].id)
        assert recording is not None and recording.transcription_ja == "こんにちは0"
    assert gateway.calls == 2


async def test_stt_uses_saved_transcript_instead_of_recognizing_the_same_recording_again(
    worker_sessions: async_sessionmaker[AsyncSession],
) -> None:
    example = await prepare_submission(worker_sessions, count=1)
    async with worker_sessions() as session:
        await session.execute(
            update(Recording)
            .where(Recording.id == example.recordings[0].id)
            .values(transcription_ja="こんにちは0")
        )
        await session.commit()
    await submit(worker_sessions, example)
    gateway = RecordingSpeechGateway()
    worker = ShadowingWorker(
        worker_sessions, gateway, MemorySpeechStorage(example, text="timeout"), Settings()
    )
    assert await worker.run_once()
    assert gateway.calls == 0


async def test_review_exposes_processing_before_speech_provider_finishes(
    worker_sessions: async_sessionmaker[AsyncSession],
) -> None:
    example = await prepare_submission(worker_sessions, count=1)
    await submit(worker_sessions, example)
    gateway = RecordingSpeechGateway()
    gateway.release.clear()
    worker = ShadowingWorker(worker_sessions, gateway, MemorySpeechStorage(example), Settings())
    running = asyncio.create_task(worker.run_once())
    try:
        await asyncio.wait_for(gateway.entered.wait(), timeout=15)
        async with submission_client(worker_sessions, example) as client:
            response = await client.get(f"/api/v1/shadowing/attempts/{example.attempt.id}/review")
            assert response.status_code == 200
            assert response.json()["transcription"]["processing"] == 1
            assert response.json()["segments"][0]["transcription_status"] == "processing"
    finally:
        gateway.release.set()
        await running


async def test_manual_retry_only_requeues_failed_recordings_and_reuses_successes(
    worker_sessions: async_sessionmaker[AsyncSession],
) -> None:
    example = await prepare_submission(worker_sessions, count=2)
    await submit(worker_sessions, example)
    storage = MemorySpeechStorage(example)
    storage.audio[example.recordings[0].storage_key] = b"timeout"
    storage.audio[example.recordings[1].storage_key] = "こんにちは1".encode()
    gateway = RecordingSpeechGateway()
    worker = ShadowingWorker(worker_sessions, gateway, storage, Settings())
    async with worker_sessions() as session:
        await session.execute(
            update(ShadowingJob)
            .where(ShadowingJob.attempt_id == example.attempt.id)
            .values(max_attempts=1)
        )
        await session.commit()
    assert await worker.run_once()
    assert await worker.run_once()
    async with submission_client(worker_sessions, example) as client:
        response = await client.post(
            f"/api/v1/shadowing/attempts/{example.attempt.id}/transcriptions", json={}
        )
        assert response.status_code == 202
        assert response.json()["queued_jobs"] == 1
        storage.audio[example.recordings[0].storage_key] = "こんにちは0".encode()
        assert await worker.run_once()
        repeated = await client.post(
            f"/api/v1/shadowing/attempts/{example.attempt.id}/transcriptions", json={}
        )
        assert repeated.status_code == 200 and repeated.json()["queued_jobs"] == 0
        review = await client.get(f"/api/v1/shadowing/attempts/{example.attempt.id}/review")
        assert review.json()["transcription"]["completed"] == 2
        assert review.json()["earned_exp"] == 50
    assert gateway.calls == 3


async def test_processing_requests_require_a_submitted_owned_attempt(
    worker_sessions: async_sessionmaker[AsyncSession],
) -> None:
    example = await prepare_submission(worker_sessions, count=1)
    other = await prepare_submission(worker_sessions, count=1)
    async with submission_client(worker_sessions, example) as client:
        pending = await client.post(
            f"/api/v1/shadowing/attempts/{example.attempt.id}/transcriptions", json={}
        )
        assert pending.status_code == 409
        forbidden = await client.post(
            f"/api/v1/shadowing/attempts/{other.attempt.id}/transcriptions", json={}
        )
        assert forbidden.status_code == 403
