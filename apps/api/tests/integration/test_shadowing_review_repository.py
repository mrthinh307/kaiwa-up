"""Real PostgreSQL tests for durable work, independent of HTTP/provider processes."""

import asyncio
import uuid
from datetime import timedelta

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.attempt import ExerciseAttempt
from app.models.content import LearningContent
from app.models.enums import AttemptStatus, ContentStatus, ContentType, JlptLevel, PracticeMethod
from app.models.shadowing import ShadowingAttemptSegment, ShadowingJob
from app.models.user import User
from app.repositories.recording import RecordingRepository
from app.repositories.shadowing_review import ShadowingReviewRepository
from app.schemas.learning_content import TranscriptSegment
from app.utils.datetime_utils import utc_now


async def create_attempt(factory: async_sessionmaker[AsyncSession]) -> uuid.UUID:
    async with factory() as session:
        user = User(
            email=f"shadowing-jobs-{uuid.uuid4().hex}@example.com",
            password_hash="unused-test-hash",
            display_name="Queue learner",
        )
        content = LearningContent(
            content_type=ContentType.SHADOWING_DICTATION,
            status=ContentStatus.PUBLISHED,
            slug=f"queue-{uuid.uuid4().hex}",
            title="Queue test",
            difficulty=JlptLevel.N5,
            transcript_ja=[{"script": "こんにちは", "start_time_ms": 0, "end_time_ms": 3000}],
            base_exp=50,
        )
        session.add_all([user, content])
        await session.flush()
        attempt = ExerciseAttempt(
            user_id=user.id,
            content_id=content.id,
            attempt_number=1,
            practice_method=PracticeMethod.SHADOWING,
            status=AttemptStatus.COMPLETED,
        )
        session.add(attempt)
        await session.commit()
        return attempt.id


async def test_review_keeps_revision_and_segments_consistent_until_read_finishes(
    shadowing_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    attempt_id = await create_attempt(shadowing_session_factory)
    async with shadowing_session_factory() as reader, shadowing_session_factory() as writer:
        assert await RecordingRepository(reader).get_attempt_for_review(attempt_id) is not None
        # Publication must not advance revision halfway through a multi-query review read.
        with pytest.raises(DBAPIError) as conflict:
            await writer.scalar(
                select(ExerciseAttempt)
                .where(ExerciseAttempt.id == attempt_id)
                .with_for_update(nowait=True)
            )
        assert getattr(conflict.value.orig, "sqlstate", None) == "55P03"
        await writer.rollback()
        await reader.rollback()
        # The read lock lives only for the request transaction.
        assert (
            await writer.scalar(
                select(ExerciseAttempt.id)
                .where(ExerciseAttempt.id == attempt_id)
                .with_for_update(nowait=True)
            )
            == attempt_id
        )


async def test_snapshot_cannot_be_overwritten_by_repeated_initialization(
    shadowing_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    attempt_id = await create_attempt(shadowing_session_factory)
    async with shadowing_session_factory() as session:
        repository = ShadowingReviewRepository(session)
        await repository.create_snapshot(
            attempt_id=attempt_id,
            segments=[TranscriptSegment(script="こんにちは", start_time_ms=0, end_time_ms=3000)],
        )
        await repository.create_snapshot(
            attempt_id=attempt_id,
            segments=[
                TranscriptSegment(script="変更された文章", start_time_ms=0, end_time_ms=5000)
            ],
        )
        await session.commit()
    async with shadowing_session_factory() as session:
        rows = list(
            await session.scalars(
                select(ShadowingAttemptSegment).where(
                    ShadowingAttemptSegment.attempt_id == attempt_id
                )
            )
        )
        assert len(rows) == 1
        assert rows[0].script == "こんにちは"
        assert rows[0].end_time_ms == 3000


async def test_duplicate_enqueue_creates_only_one_durable_job(
    shadowing_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    attempt_id = await create_attempt(shadowing_session_factory)

    async def enqueue() -> uuid.UUID:
        async with shadowing_session_factory() as session:
            job = await ShadowingReviewRepository(session).enqueue_job(
                attempt_id=attempt_id,
                kind="transcribe_recording",
                fingerprint="same-recording-input",
                payload={"segment_index": 0},
            )
            await session.commit()
            return job.id

    ids = await asyncio.gather(enqueue(), enqueue())
    assert ids[0] == ids[1]
    async with shadowing_session_factory() as session:
        count = await session.scalar(
            select(func.count())
            .select_from(ShadowingJob)
            .where(ShadowingJob.attempt_id == attempt_id)
        )
        assert count == 1


async def test_two_workers_cannot_claim_the_same_job(
    shadowing_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    attempt_id = await create_attempt(shadowing_session_factory)
    async with shadowing_session_factory() as session:
        await ShadowingReviewRepository(session).enqueue_job(
            attempt_id=attempt_id, kind="evaluate_batch", fingerprint="claim-once", payload={}
        )
        await session.commit()

    async def claim() -> uuid.UUID | None:
        async with shadowing_session_factory() as session:
            job = await ShadowingReviewRepository(session).claim_job(
                kinds=["evaluate_batch"],
                lease_token=uuid.uuid4(),
                lease_seconds=180,
            )
            await session.commit()
            return job.id if job else None

    results = await asyncio.gather(claim(), claim())
    assert sum(result is not None for result in results) == 1


async def test_reclaimed_job_rejects_the_previous_workers_completion(
    shadowing_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    attempt_id = await create_attempt(shadowing_session_factory)
    old_token, new_token = uuid.uuid4(), uuid.uuid4()
    async with shadowing_session_factory() as session:
        repository = ShadowingReviewRepository(session)
        job = await repository.enqueue_job(
            attempt_id=attempt_id, kind="summarize_feedback", fingerprint="lease-test", payload={}
        )
        job_id = job.id
        claimed = await repository.claim_job(
            kinds=["summarize_feedback"], lease_token=old_token, lease_seconds=180
        )
        assert claimed is not None and claimed.id == job_id
        await session.execute(
            update(ShadowingJob)
            .where(ShadowingJob.id == job_id)
            .values(locked_until=utc_now() - timedelta(seconds=1))
        )
        await session.commit()

    async with shadowing_session_factory() as session:
        repository = ShadowingReviewRepository(session)
        assert await repository.requeue_expired_jobs(now=utc_now()) == 1
        claimed = await repository.claim_job(
            kinds=["summarize_feedback"], lease_token=new_token, lease_seconds=180
        )
        assert claimed is not None and claimed.id == job_id
        assert claimed.attempt_count == 2
        await session.commit()

    async with shadowing_session_factory() as session:
        repository = ShadowingReviewRepository(session)
        assert not await repository.finish_job(
            job_id=job_id, lease_token=old_token, result={"old": True}
        )
        assert await repository.finish_job(
            job_id=job_id, lease_token=new_token, result={"new": True}
        )
        await session.commit()
    async with shadowing_session_factory() as session:
        finished = await session.get(ShadowingJob, job_id)
        assert finished is not None and finished.status == "completed"
        assert finished.result == {"new": True}


async def test_enqueue_rollback_leaves_no_job(
    shadowing_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    attempt_id = await create_attempt(shadowing_session_factory)
    async with shadowing_session_factory() as session:
        job = await ShadowingReviewRepository(session).enqueue_job(
            attempt_id=attempt_id, kind="evaluate_batch", fingerprint="rollback", payload={}
        )
        job_id = job.id
        await session.rollback()
    async with shadowing_session_factory() as session:
        assert await session.get(ShadowingJob, job_id) is None
