"""Submission commits independently of speech providers and schedules only accepted takes."""

import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass

import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.dependencies.ai import get_ai_gateway
from app.api.dependencies.auth import get_current_user
from app.api.dependencies.database import get_db_session
from app.integrations.ai.providers.fake import FakeAiGateway
from app.main import app
from app.models.attempt import ExerciseAttempt, Recording
from app.models.content import LearningContent
from app.models.enums import (
    AttemptStatus,
    ContentStatus,
    ContentType,
    JlptLevel,
    PracticeMethod,
    RecordingKind,
)
from app.models.gamification import XpTransaction
from app.models.shadowing import ShadowingAttemptSegment, ShadowingJob
from app.models.user import User


@dataclass
class SubmissionExample:
    user: User
    content: LearningContent
    attempt: ExerciseAttempt
    recordings: list[Recording]


async def prepare_submission(
    factory: async_sessionmaker[AsyncSession], *, count: int = 2, recorded: int | None = None
) -> SubmissionExample:
    async with factory() as session:
        user = User(email=f"submit-{uuid.uuid4().hex}@example.com", password_hash="unused")
        content = LearningContent(
            content_type=ContentType.SHADOWING_DICTATION,
            status=ContentStatus.PUBLISHED,
            slug=f"submit-{uuid.uuid4().hex}",
            title="Submission test",
            difficulty=JlptLevel.N5,
            audio_url="https://example.com/lesson.webm",
            audio_duration_ms=count * 3000,
            transcript_ja=[
                {
                    "script": f"こんにちは{i}",
                    "start_time_ms": i * 3000,
                    "end_time_ms": (i + 1) * 3000,
                }
                for i in range(count)
            ],
            base_exp=50,
        )
        session.add_all([user, content])
        await session.flush()
        attempt = ExerciseAttempt(
            user_id=user.id,
            content_id=content.id,
            attempt_number=1,
            practice_method=PracticeMethod.SHADOWING,
            status=AttemptStatus.IN_PROGRESS,
            answer_payload={"mode": "segmented"},
        )
        session.add(attempt)
        await session.flush()
        recordings = [
            Recording(
                user_id=user.id,
                attempt_id=attempt.id,
                kind=RecordingKind.SHADOWING,
                storage_key=f"test/{uuid.uuid4().hex}.webm",
                duration_ms=3000,
                mime_type="audio/webm",
            )
            for _ in range(count if recorded is None else recorded)
        ]
        session.add_all(recordings)
        await session.flush()
        attempt.answer_payload = {
            "mode": "segmented",
            "segments": [
                {
                    "segment_id": str(index),
                    "recording_id": str(recording.id),
                    "duration_ms": 3000,
                    "duration_seconds": 3,
                }
                for index, recording in enumerate(recordings)
            ],
        }
        await session.commit()
        return SubmissionExample(user, content, attempt, recordings)


@asynccontextmanager
async def submission_client(
    factory: async_sessionmaker[AsyncSession], example: SubmissionExample
) -> AsyncIterator[httpx.AsyncClient]:
    async def session_dependency() -> AsyncIterator[AsyncSession]:
        async with factory() as session:
            yield session

    gateway = FakeAiGateway()
    previous = app.dependency_overrides.copy()
    app.dependency_overrides[get_current_user] = lambda: example.user
    app.dependency_overrides[get_db_session] = session_dependency
    app.dependency_overrides[get_ai_gateway] = lambda: gateway
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            yield client
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)


@pytest.mark.parametrize("request_ai_review", [False, True])
async def test_submit_enqueues_stt_but_never_runs_or_enqueues_overall_ai(
    shadowing_session_factory: async_sessionmaker[AsyncSession], request_ai_review: bool
) -> None:
    example = await prepare_submission(shadowing_session_factory)
    async with submission_client(shadowing_session_factory, example) as client:
        response = await client.post(
            f"/api/v1/shadowing/{example.content.id}/submit",
            json={"attempt_id": str(example.attempt.id), "request_ai_review": request_ai_review},
        )
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "completed"
        assert result["score"] == 100
        assert result["xp_earned"] == 50
        assert result["ai_review"]["status"] == "not_requested"
        assert result["transcription"]["queued"] == 2
        assert result["ai_feedback"] is None
    async with shadowing_session_factory() as session:
        jobs = list(
            await session.scalars(
                select(ShadowingJob).where(ShadowingJob.attempt_id == example.attempt.id)
            )
        )
        assert len(jobs) == 2
        assert {job.kind for job in jobs} == {"transcribe_recording"}
        assert all(job.attempt_count == 0 for job in jobs)


async def test_repeated_submit_keeps_one_reward_and_one_job_per_recording(
    shadowing_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    example = await prepare_submission(shadowing_session_factory)
    async with submission_client(shadowing_session_factory, example) as client:
        responses = [
            await client.post(
                f"/api/v1/shadowing/{example.content.id}/submit",
                json={"attempt_id": str(example.attempt.id)},
            )
            for _ in range(2)
        ]
        assert all(response.status_code == 200 for response in responses)
        assert responses[0].json()["xp_earned"] == responses[1].json()["xp_earned"] == 50
    async with shadowing_session_factory() as session:
        assert (
            await session.scalar(
                select(func.count())
                .select_from(XpTransaction)
                .where(XpTransaction.attempt_id == example.attempt.id)
            )
            == 1
        )
        assert (
            await session.scalar(
                select(func.count())
                .select_from(ShadowingJob)
                .where(ShadowingJob.attempt_id == example.attempt.id)
            )
            == 2
        )


async def test_first_submit_without_a_saved_recording_is_rejected(
    shadowing_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    example = await prepare_submission(shadowing_session_factory, recorded=0)
    async with submission_client(shadowing_session_factory, example) as client:
        response = await client.post(
            f"/api/v1/shadowing/{example.content.id}/submit",
            json={"attempt_id": str(example.attempt.id)},
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "shadowing_no_recordings"
    async with shadowing_session_factory() as session:
        attempt = await session.get(ExerciseAttempt, example.attempt.id)
        assert attempt is not None and attempt.status == AttemptStatus.IN_PROGRESS


async def test_stale_recording_manifest_is_rejected_without_granting_exp(
    shadowing_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    example = await prepare_submission(shadowing_session_factory)
    async with submission_client(shadowing_session_factory, example) as client:
        response = await client.post(
            f"/api/v1/shadowing/{example.content.id}/submit",
            json={
                "attempt_id": str(example.attempt.id),
                "recordings": [{"segment_index": 0, "recording_id": str(uuid.uuid4())}],
            },
        )
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "shadowing_recordings_changed"
    async with shadowing_session_factory() as session:
        assert (
            await session.scalar(
                select(func.count())
                .select_from(XpTransaction)
                .where(XpTransaction.attempt_id == example.attempt.id)
            )
            == 0
        )


async def test_200_segment_submission_returns_all_queued_before_any_stt_runs(
    shadowing_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    example = await prepare_submission(shadowing_session_factory, count=200)
    async with submission_client(shadowing_session_factory, example) as client:
        response = await client.post(
            f"/api/v1/shadowing/{example.content.id}/submit",
            json={"attempt_id": str(example.attempt.id)},
        )
        assert response.status_code == 200
        assert response.json()["transcription"]["queued"] == 200
        review = await client.get(f"/api/v1/shadowing/attempts/{example.attempt.id}/review")
        assert review.status_code == 200
        result = review.json()
        assert result["status"] == "completed"
        assert len(result["segments"]) == 200
        assert all(segment["transcription_status"] == "queued" for segment in result["segments"])
        assert all(segment["text_match_score"] is None for segment in result["segments"])
    async with shadowing_session_factory() as session:
        assert (
            await session.scalar(
                select(func.count())
                .select_from(ShadowingAttemptSegment)
                .where(ShadowingAttemptSegment.attempt_id == example.attempt.id)
            )
            == 200
        )
