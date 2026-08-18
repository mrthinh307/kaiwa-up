import uuid
from decimal import Decimal
from io import BytesIO

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.main import app
from app.models.attempt import ExerciseAttempt, Recording
from app.models.content import LearningContent
from app.models.enums import AttemptStatus, ContentStatus, ContentType, JlptLevel, RecordingKind
from app.models.gamification import XpTransaction
from app.models.user import User, UserProgress


async def create_test_user(session: AsyncSession, *, email: str) -> User:
    user = User(email=email, password_hash="hash", display_name="Shadowing User")
    session.add(user)
    await session.flush()
    return user


async def create_shadowing_content(
    session: AsyncSession,
    *,
    slug: str,
    transcript_ja: list[dict[str, object]] | None = None,
) -> LearningContent:
    segments = (
        transcript_ja
        if transcript_ja is not None
        else [
            {
                "start_time_ms": 0,
                "end_time_ms": 5000,
                "script": "いらっしゃいませ。",
            },
            {
                "start_time_ms": 5000,
                "end_time_ms": 10000,
                "script": "何をお探しですか？",
            },
        ]
    )
    content = LearningContent(
        content_type=ContentType.SHADOWING_DICTATION,
        status=ContentStatus.PUBLISHED,
        slug=slug,
        title="Shopping Conversation",
        difficulty=JlptLevel.N4,
        audio_url="https://example.com/shopping.mp3",
        transcript_ja=segments,
        base_exp=50,
    )
    session.add(content)
    await session.flush()
    return content


@pytest.mark.asyncio
async def test_record_segment_creates_attempt_automatically(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user = await create_test_user(db_session, email="shadowing_auto@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-auto")
    app.dependency_overrides[get_current_user] = lambda: user

    audio_bytes = b"fake_audio_stream_data_sample"
    files = {"audio_file": ("recording.webm", BytesIO(audio_bytes), "audio/webm")}
    data = {"segment_id": "0"}

    response = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files=files,
        data=data,
    )

    assert response.status_code == 201
    res_data = response.json()
    assert res_data["segment_id"] == "0"
    assert "recording_id" in res_data
    assert "attempt_id" in res_data
    assert res_data["storage_key"].startswith("recordings/") or res_data["storage_key"].startswith(
        "http"
    )

    # Verify ExerciseAttempt created in DB
    attempt = await db_session.scalar(
        select(ExerciseAttempt).where(ExerciseAttempt.id == uuid.UUID(res_data["attempt_id"]))
    )
    assert attempt is not None
    assert attempt.user_id == user.id
    assert attempt.content_id == content.id
    assert attempt.attempt_number == 1
    assert attempt.status == AttemptStatus.IN_PROGRESS

    # Verify Recording created in DB
    recording = await db_session.scalar(
        select(Recording).where(Recording.id == uuid.UUID(res_data["recording_id"]))
    )
    assert recording is not None
    assert recording.kind == RecordingKind.SHADOWING
    assert recording.user_id == user.id
    assert recording.attempt_id == attempt.id


@pytest.mark.asyncio
async def test_record_segment_reuses_provided_attempt_id(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user = await create_test_user(db_session, email="shadowing_reuse@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-reuse")
    app.dependency_overrides[get_current_user] = lambda: user

    # First segment upload (auto creates attempt)
    audio_bytes1 = b"audio_data_segment_1"
    res1 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("seg1.webm", BytesIO(audio_bytes1), "audio/webm")},
        data={"segment_id": "0"},
    )
    assert res1.status_code == 201
    attempt_id = res1.json()["attempt_id"]

    # Second segment upload reusing attempt_id
    audio_bytes2 = b"audio_data_segment_2"
    res2 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("seg2.webm", BytesIO(audio_bytes2), "audio/webm")},
        data={"segment_id": "1", "attempt_id": attempt_id},
    )
    assert res2.status_code == 201
    assert res2.json()["attempt_id"] == attempt_id

    # Verify only 1 attempt exists for this user and content
    attempts = (
        (
            await db_session.execute(
                select(ExerciseAttempt).where(
                    ExerciseAttempt.user_id == user.id,
                    ExerciseAttempt.content_id == content.id,
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(attempts) == 1


@pytest.mark.asyncio
async def test_record_segment_invalid_segment_returns_bad_request(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user = await create_test_user(db_session, email="shadowing_invalid_seg@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-invalid-seg")
    app.dependency_overrides[get_current_user] = lambda: user

    response = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("test.webm", BytesIO(b"audio"), "audio/webm")},
        data={"segment_id": "non_existent_segment"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "shadowing_invalid_segment"

    # Also verify out of range integer index
    response_out_of_bounds = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("test.webm", BytesIO(b"audio"), "audio/webm")},
        data={"segment_id": "999"},
    )
    assert response_out_of_bounds.status_code == 400
    assert response_out_of_bounds.json()["error"]["code"] == "shadowing_invalid_segment"


@pytest.mark.asyncio
async def test_record_segment_file_too_large_returns_bad_request(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user = await create_test_user(db_session, email="shadowing_large_file@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-large-file")
    app.dependency_overrides[get_current_user] = lambda: user

    large_audio = b"0" * (11 * 1024 * 1024)  # 11MB
    response = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("huge.webm", BytesIO(large_audio), "audio/webm")},
        data={"segment_id": "0"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "shadowing_audio_too_large"


@pytest.mark.asyncio
async def test_get_recording_playback_owner_success(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user = await create_test_user(db_session, email="shadowing_owner@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-owner")
    app.dependency_overrides[get_current_user] = lambda: user

    res_upload = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("test.webm", BytesIO(b"sample_audio"), "audio/webm")},
        data={"segment_id": "0"},
    )
    recording_id = res_upload.json()["recording_id"]

    response = await client.get(f"/api/v1/shadowing/recordings/{recording_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["recording_id"] == recording_id
    assert "playback_url" in data
    assert data["playback_url"].startswith("/static/recordings/") or data[
        "playback_url"
    ].startswith("http")


@pytest.mark.asyncio
async def test_get_recording_playback_unauthorized_user_forbidden(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user_a = await create_test_user(db_session, email="user_a@example.com")
    user_b = await create_test_user(db_session, email="user_b@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-forbidden")

    # User A records audio
    app.dependency_overrides[get_current_user] = lambda: user_a
    res_upload = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("user_a.webm", BytesIO(b"user_a_audio"), "audio/webm")},
        data={"segment_id": "0"},
    )
    recording_id = res_upload.json()["recording_id"]

    # User B attempts to access User A's recording
    app.dependency_overrides[get_current_user] = lambda: user_b
    response = await client.get(f"/api/v1/shadowing/recordings/{recording_id}")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_submit_shadowing_attempt_full_completion_success(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user = await create_test_user(db_session, email="shadowing_submit_full@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-submit-full")
    app.dependency_overrides[get_current_user] = lambda: user

    # Content created by helper has 1 segment (index 0)
    # Record segment 0 with 2.5s audio (simulate duration >= 2s)
    # Storage service duration defaults to max(1, size // 16000)
    audio_bytes = b"0" * 40000  # > 32000 bytes => duration_seconds >= 2
    res_upload0 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("test0.webm", BytesIO(audio_bytes), "audio/webm")},
        data={"segment_id": "0"},
    )
    assert res_upload0.status_code == 201
    attempt_id = res_upload0.json()["attempt_id"]

    res_upload1 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("test1.webm", BytesIO(audio_bytes), "audio/webm")},
        data={"segment_id": "1", "attempt_id": attempt_id},
    )
    assert res_upload1.status_code == 201

    # Submit attempt
    submit_res = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 2},
    )
    assert submit_res.status_code == 200
    data = submit_res.json()
    assert data["attempt_id"] == attempt_id
    assert data["status"] == "completed"
    assert data["score"] == 100.0
    assert data["xp_earned"] == 50
    assert data["content_type"] == "shadowing"
    assert data["difficulty"] == "N4"
    assert data["user_progress"]["total_exp"] == 50
    assert data["user_progress"]["current_level"] == 2

    # Verify attempt in DB
    attempt = await db_session.scalar(
        select(ExerciseAttempt).where(ExerciseAttempt.id == uuid.UUID(attempt_id))
    )
    assert attempt is not None
    assert attempt.status == AttemptStatus.COMPLETED
    assert attempt.score == Decimal("100.00")
    assert attempt.correct_count == 2
    assert attempt.total_count == 2
    assert attempt.completed_at is not None
    assert attempt.answer_payload["replay_count"] == 2

    # Verify XpTransaction in DB
    tx = await db_session.scalar(
        select(XpTransaction).where(XpTransaction.attempt_id == uuid.UUID(attempt_id))
    )
    assert tx is not None
    assert tx.amount == 50
    assert tx.user_id == user.id

    # Verify UserProgress in DB
    progress = await db_session.scalar(select(UserProgress).where(UserProgress.user_id == user.id))
    assert progress is not None
    assert progress.total_exp == 50
    assert progress.completed_content_count == 1


@pytest.mark.asyncio
async def test_submit_shadowing_attempt_partial_completion_and_tiers(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user = await create_test_user(db_session, email="shadowing_partial@example.com")
    # Create content with 4 segments
    four_segments = [
        {"start_time_ms": 0, "end_time_ms": 1000, "script": "Seg 0", "index": 0},
        {"start_time_ms": 1000, "end_time_ms": 2000, "script": "Seg 1", "index": 1},
        {"start_time_ms": 2000, "end_time_ms": 3000, "script": "Seg 2", "index": 2},
        {"start_time_ms": 3000, "end_time_ms": 4000, "script": "Seg 3", "index": 3},
    ]
    content = await create_shadowing_content(
        db_session,
        slug="shadowing-partial-tiers",
        transcript_ja=four_segments,
    )
    app.dependency_overrides[get_current_user] = lambda: user

    # Record 1 out of 4 segments (25% ratio -> Tier >= 25% and < 50% => 25 EXP)
    audio_bytes = b"0" * 40000
    res_upload = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("seg0.webm", BytesIO(audio_bytes), "audio/webm")},
        data={"segment_id": "0"},
    )
    attempt_id = res_upload.json()["attempt_id"]

    submit_res = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0},
    )
    assert submit_res.status_code == 200
    data = submit_res.json()
    assert data["score"] == 25.0
    assert data["xp_earned"] == 25
    assert data["user_progress"]["total_exp"] == 25


@pytest.mark.asyncio
async def test_submit_shadowing_attempt_zero_completion_no_xp(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user = await create_test_user(db_session, email="shadowing_zero_exp@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-zero-exp")
    app.dependency_overrides[get_current_user] = lambda: user

    # Create an attempt without valid recordings by creating attempt directly
    attempt = ExerciseAttempt(
        user_id=user.id,
        content_id=content.id,
        attempt_number=1,
        status=AttemptStatus.IN_PROGRESS,
        answer_payload={},
    )
    db_session.add(attempt)
    await db_session.commit()

    submit_res = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": str(attempt.id), "replay_count": 1},
    )
    assert submit_res.status_code == 200
    data = submit_res.json()
    assert data["score"] == 0.0
    assert data["xp_earned"] == 0
    assert data["status"] == "completed"

    # Verify NO XpTransaction was created
    tx = await db_session.scalar(
        select(XpTransaction).where(XpTransaction.attempt_id == attempt.id)
    )
    assert tx is None


@pytest.mark.asyncio
async def test_submit_shadowing_attempt_idempotency(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user = await create_test_user(db_session, email="shadowing_idempotency@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-idempotent")
    app.dependency_overrides[get_current_user] = lambda: user

    audio_bytes = b"0" * 40000
    res_upload = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("seg0.webm", BytesIO(audio_bytes), "audio/webm")},
        data={"segment_id": "0"},
    )
    attempt_id = res_upload.json()["attempt_id"]

    # First submission
    res1 = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0},
    )
    assert res1.status_code == 200
    data1 = res1.json()

    # Second submission (should return identical data and not duplicate XP)
    res2 = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0},
    )
    assert res2.status_code == 200
    data2 = res2.json()

    assert data1["score"] == data2["score"]
    assert data1["xp_earned"] == data2["xp_earned"]
    assert data1["user_progress"]["total_exp"] == data2["user_progress"]["total_exp"]

    # Verify only 1 XpTransaction exists
    txs = (
        (
            await db_session.execute(
                select(XpTransaction).where(XpTransaction.attempt_id == uuid.UUID(attempt_id))
            )
        )
        .scalars()
        .all()
    )
    assert len(txs) == 1


@pytest.mark.asyncio
async def test_submit_shadowing_attempt_repeated_practice_completed_count(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user = await create_test_user(db_session, email="shadowing_repeat@example.com")
    content = await create_shadowing_content(
        db_session,
        slug="shadowing-repeat",
        transcript_ja=[{"start_time_ms": 0, "end_time_ms": 5000, "script": "テスト"}],
    )
    app.dependency_overrides[get_current_user] = lambda: user

    # First attempt on content
    audio_bytes = b"0" * 40000
    res_upload1 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("attempt1.webm", BytesIO(audio_bytes), "audio/webm")},
        data={"segment_id": "0"},
    )
    attempt_id1 = res_upload1.json()["attempt_id"]

    res_submit1 = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id1, "replay_count": 0},
    )
    assert res_submit1.status_code == 200

    progress1 = await db_session.scalar(select(UserProgress).where(UserProgress.user_id == user.id))
    assert progress1.completed_content_count == 1
    assert progress1.total_exp == 50

    # Second attempt on SAME content
    res_upload2 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("attempt2.webm", BytesIO(audio_bytes), "audio/webm")},
        data={"segment_id": "0"},
    )
    attempt_id2 = res_upload2.json()["attempt_id"]
    assert attempt_id2 != attempt_id1

    res_submit2 = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id2, "replay_count": 0},
    )
    assert res_submit2.status_code == 200

    await db_session.refresh(progress1)
    # completed_content_count should NOT increase, but total_exp should increase to 100
    assert progress1.completed_content_count == 1
    assert progress1.total_exp == 100


@pytest.mark.asyncio
async def test_submit_shadowing_attempt_forbidden_user(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user_a = await create_test_user(db_session, email="owner_a@example.com")
    user_b = await create_test_user(db_session, email="owner_b@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-forbidden-submit")

    app.dependency_overrides[get_current_user] = lambda: user_a
    res_upload = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("seg0.webm", BytesIO(b"0" * 40000), "audio/webm")},
        data={"segment_id": "0"},
    )
    attempt_id = res_upload.json()["attempt_id"]

    # User B tries to submit User A's attempt
    app.dependency_overrides[get_current_user] = lambda: user_b
    res_submit = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0},
    )
    assert res_submit.status_code == 403
    assert res_submit.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_get_shadowing_attempt_review_success(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user = await create_test_user(db_session, email="shadowing_review@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-review")
    app.dependency_overrides[get_current_user] = lambda: user

    res_upload0 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("test0.webm", BytesIO(b"0" * 40000), "audio/webm")},
        data={"segment_id": "0"},
    )
    attempt_id = res_upload0.json()["attempt_id"]

    # Submit attempt
    await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 1},
    )

    # Get attempt review
    res_review = await client.get(f"/api/v1/shadowing/attempts/{attempt_id}/review")
    assert res_review.status_code == 200
    data = res_review.json()
    assert data["attempt_id"] == attempt_id
    assert data["title"] == "Shopping Conversation"
    assert data["total_segments"] == 2
    assert data["completed_segments"] == 1
    assert len(data["segments"]) == 2

    # Segment 0 was recorded
    seg0 = data["segments"][0]
    assert seg0["segment_index"] == 0
    assert seg0["recorded"] is True
    assert seg0["playback_url"] is not None
    assert seg0["script"] == "いらっしゃいませ。"

    # Segment 1 was not recorded
    seg1 = data["segments"][1]
    assert seg1["segment_index"] == 1
    assert seg1["recorded"] is False
    assert seg1["script"] == "何をお探しですか？"


@pytest.mark.asyncio
async def test_get_shadowing_attempt_review_forbidden(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user_a = await create_test_user(db_session, email="review_owner_a@example.com")
    user_b = await create_test_user(db_session, email="review_owner_b@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-review-forbidden")

    app.dependency_overrides[get_current_user] = lambda: user_a
    res_upload = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("test.webm", BytesIO(b"0" * 40000), "audio/webm")},
        data={"segment_id": "0"},
    )
    attempt_id = res_upload.json()["attempt_id"]

    # User B tries to view review of User A's attempt
    app.dependency_overrides[get_current_user] = lambda: user_b
    res_review = await client.get(f"/api/v1/shadowing/attempts/{attempt_id}/review")
    assert res_review.status_code == 403
    assert res_review.json()["error"]["code"] == "forbidden"
