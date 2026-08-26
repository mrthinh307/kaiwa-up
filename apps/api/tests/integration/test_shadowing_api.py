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
from app.models.enums import (
    AttemptStatus,
    ContentStatus,
    ContentType,
    JlptLevel,
    PracticeMethod,
    RecordingKind,
)
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
    assert attempt.practice_method == PracticeMethod.SHADOWING
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
async def test_record_segment_without_attempt_id_rejects_existing_shadowing_attempt(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await create_test_user(db_session, email="shadowing-duplicate@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-duplicate")
    app.dependency_overrides[get_current_user] = lambda: user

    first_response = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("first.webm", BytesIO(b"first-audio"), "audio/webm")},
        data={"segment_id": "0"},
    )
    second_response = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("second.webm", BytesIO(b"second-audio"), "audio/webm")},
        data={"segment_id": "1"},
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert second_response.json()["error"] == {
        "status": 409,
        "code": "attempt_already_in_progress",
        "message": "An attempt is already in progress for this practice method",
        "details": {
            "attempt_id": first_response.json()["attempt_id"],
            "practice_method": "shadowing",
        },
    }


@pytest.mark.asyncio
async def test_dictation_attempt_does_not_block_shadowing_recording(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await create_test_user(db_session, email="shadowing-cross-method@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-cross-method")
    dictation_attempt = ExerciseAttempt(
        user_id=user.id,
        content_id=content.id,
        attempt_number=1,
        practice_method=PracticeMethod.DICTATION,
        status=AttemptStatus.IN_PROGRESS,
        answer_payload={},
    )
    db_session.add(dictation_attempt)
    await db_session.flush()
    app.dependency_overrides[get_current_user] = lambda: user

    response = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("shadow.webm", BytesIO(b"shadow-audio"), "audio/webm")},
        data={"segment_id": "0"},
    )

    assert response.status_code == 201
    assert response.json()["attempt_id"] != str(dictation_attempt.id)


@pytest.mark.asyncio
@pytest.mark.parametrize("practice_method", [PracticeMethod.DICTATION, None])
async def test_shadowing_operations_reject_wrong_method_and_legacy_attempts(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    practice_method: PracticeMethod | None,
) -> None:
    user = await create_test_user(
        db_session,
        email=f"shadowing-wrong-method-{practice_method}@example.com",
    )
    content = await create_shadowing_content(
        db_session,
        slug=f"shadowing-wrong-method-{practice_method}",
    )
    attempt = ExerciseAttempt(
        user_id=user.id,
        content_id=content.id,
        attempt_number=1,
        practice_method=practice_method,
        status=AttemptStatus.IN_PROGRESS,
        answer_payload={},
    )
    db_session.add(attempt)
    await db_session.flush()
    app.dependency_overrides[get_current_user] = lambda: user

    record_response = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("wrong.webm", BytesIO(b"wrong-audio"), "audio/webm")},
        data={"segment_id": "0", "attempt_id": str(attempt.id)},
    )
    submit_response = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": str(attempt.id), "replay_count": 0},
    )
    review_response = await client.get(f"/api/v1/shadowing/attempts/{attempt.id}/review")
    resume_response = await client.get(f"/api/v1/shadowing/{content.id}/in-progress")

    assert record_response.status_code == 404
    assert submit_response.status_code == 404
    assert review_response.status_code == 404
    assert resume_response.status_code == 404


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
        practice_method=PracticeMethod.SHADOWING,
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


@pytest.mark.asyncio
async def test_get_in_progress_shadowing_attempt_success(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user = await create_test_user(db_session, email="in_progress_shadowing@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-in-progress-test")
    app.dependency_overrides[get_current_user] = lambda: user

    # Initially no in-progress attempt
    res_empty = await client.get(f"/api/v1/shadowing/{content.id}/in-progress")
    assert res_empty.status_code == 404

    # Record segment 0
    res_upload = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("test.webm", BytesIO(b"0" * 40000), "audio/webm")},
        data={"segment_id": "0"},
    )
    assert res_upload.status_code == 201
    attempt_id = res_upload.json()["attempt_id"]

    # In-progress attempt exists
    res_progress = await client.get(f"/api/v1/shadowing/{content.id}/in-progress")
    assert res_progress.status_code == 200
    data = res_progress.json()
    assert data["attempt_id"] == attempt_id
    assert data["total_segments"] == 2
    assert len(data["recorded_segments"]) == 1
    assert data["recorded_segments"][0]["segment_id"] == "0"
    assert data["total_attempts"] == 1


@pytest.mark.asyncio
async def test_record_continuous_and_submit_success(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    user = await create_test_user(db_session, email="continuous_shadowing@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-continuous-test")
    # Set audio_duration_ms on content
    content.audio_duration_ms = 10000
    await db_session.flush()
    app.dependency_overrides[get_current_user] = lambda: user

    # 1. Record continuous audio
    audio_bytes = b"fake_continuous_audio_bytes" * 500
    files = {"audio_file": ("continuous.webm", BytesIO(audio_bytes), "audio/webm")}
    data = {"duration_seconds": 10}

    res_record = await client.post(
        f"/api/v1/shadowing/{content.id}/record-continuous",
        files=files,
        data=data,
    )
    assert res_record.status_code == 201
    rec_data = res_record.json()
    assert "recording_id" in rec_data
    assert "attempt_id" in rec_data
    attempt_id = rec_data["attempt_id"]

    # 2. Check in-progress status shows continuous mode
    res_in_prog = await client.get(f"/api/v1/shadowing/{content.id}/in-progress")
    assert res_in_prog.status_code == 200
    in_prog_data = res_in_prog.json()
    assert in_prog_data["mode"] == "continuous"
    assert in_prog_data["continuous_recording"] is not None

    # 3. Submit attempt
    res_submit = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0},
    )
    assert res_submit.status_code == 200
    submit_data = res_submit.json()
    assert submit_data["status"] == "completed"
    assert submit_data["score"] == 100.0
    assert submit_data["xp_earned"] == 50

    # 4. Check review
    res_review = await client.get(f"/api/v1/shadowing/attempts/{attempt_id}/review")
    assert res_review.status_code == 200
    rev_data = res_review.json()
    assert rev_data["mode"] == "continuous"
    assert rev_data["user_continuous_recording_url"] is not None
    assert rev_data["user_continuous_duration_seconds"] == 10


class MockShadowingAiGateway:
    def __init__(self, score: int = 85, text: str = "いらっしゃいませ。"):
        self.score = score
        self.text = text
        self.transcribe_called = False
        self.evaluate_called = False

    async def transcribe(
        self,
        *,
        audio: bytes,
        filename: str,
        language: str,
        prompt_hint: str | None = None,
    ):
        from app.integrations.ai.contracts import TranscriptionResult

        self.transcribe_called = True
        return TranscriptionResult(text=self.text, language=language)

    async def evaluate_shadowing(
        self,
        *,
        reference_transcript: str,
        user_transcript: str,
    ):
        from app.integrations.ai.contracts import Correction, EvaluationResult

        self.evaluate_called = True
        return EvaluationResult(
            score=self.score,
            is_acceptable=self.score >= 70,
            feedback="Phát âm tốt, ngữ điệu tự nhiên.",
            corrections=[
                Correction(original="おさ菓子", corrected="お探し", reason="Phát âm nhầm âm ngắt")
            ],
            hints=["Lưu ý nhấn giọng ở cuối câu"],
        )


@pytest.mark.asyncio
async def test_submit_shadowing_with_ai_gateway_populates_informational_feedback(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    from app.api.dependencies.ai import get_ai_gateway
    from app.models.attempt import AiEvaluation

    user = await create_test_user(db_session, email="ai_shadowing_feedback@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-ai-feedback")
    content.audio_duration_ms = 10000
    await db_session.flush()

    mock_ai = MockShadowingAiGateway(score=88, text="いらっしゃいませ。")
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_ai_gateway] = lambda: mock_ai

    # Record continuous audio
    audio_bytes = b"fake_audio_stream_data_sample" * 500
    files = {"audio_file": ("continuous.webm", BytesIO(audio_bytes), "audio/webm")}
    res_rec = await client.post(
        f"/api/v1/shadowing/{content.id}/record-continuous",
        files=files,
        data={"duration_seconds": 10},
    )
    assert res_rec.status_code == 201
    attempt_id = res_rec.json()["attempt_id"]
    recording_id = res_rec.json()["recording_id"]

    # Submit attempt with AI review requested
    res_submit = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0, "request_ai_review": True},
    )
    assert res_submit.status_code == 200
    submit_data = res_submit.json()

    # Verify official deterministic score and EXP
    assert submit_data["score"] == 100.0
    assert submit_data["xp_earned"] == 50

    # Verify informational AI feedback
    assert submit_data["ai_feedback"] is not None
    assert submit_data["ai_feedback"]["similarity_score"] == 88.0
    assert submit_data["ai_feedback"]["feedback"] == "Phát âm tốt, ngữ điệu tự nhiên."
    assert len(submit_data["ai_feedback"]["corrections"]) == 1
    assert submit_data["ai_feedback"]["corrections"][0]["original"] == "おさ菓子"

    # Verify DB persistence of AiEvaluation and transcription_ja
    ai_eval = await db_session.scalar(
        select(AiEvaluation).where(AiEvaluation.attempt_id == uuid.UUID(attempt_id))
    )
    assert ai_eval is not None
    assert ai_eval.similarity_score == Decimal("88.00")

    rec = await db_session.scalar(select(Recording).where(Recording.id == uuid.UUID(recording_id)))
    assert rec is not None
    assert rec.transcription_ja == "いらっしゃいませ。"

    # Verify Review endpoint
    res_review = await client.get(f"/api/v1/shadowing/attempts/{attempt_id}/review")
    assert res_review.status_code == 200
    rev_data = res_review.json()
    assert rev_data["ai_feedback"] is not None
    assert rev_data["ai_feedback"]["similarity_score"] == 88.0
    assert rev_data["user_continuous_transcript"] == "いらっしゃいませ。"


@pytest.mark.asyncio
async def test_ai_evaluation_is_strictly_informational_and_does_not_affect_official_score_or_exp(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    """Verifies that AI similarity score does not alter official deterministic score and EXP."""
    from app.api.dependencies.ai import get_ai_gateway

    user = await create_test_user(db_session, email="ai_shadowing_isolation@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-ai-isolation")
    content.audio_duration_ms = 10000
    await db_session.flush()

    # AI returns a very low score (15%), but user completed 100% of duration
    mock_ai = MockShadowingAiGateway(score=15, text="間違ったテキスト")
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_ai_gateway] = lambda: mock_ai

    audio_bytes = b"fake_audio_stream_data_sample" * 500
    files = {"audio_file": ("continuous.webm", BytesIO(audio_bytes), "audio/webm")}
    res_rec = await client.post(
        f"/api/v1/shadowing/{content.id}/record-continuous",
        files=files,
        data={"duration_seconds": 10},
    )
    attempt_id = res_rec.json()["attempt_id"]

    res_submit = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0, "request_ai_review": True},
    )
    assert res_submit.status_code == 200
    submit_data = res_submit.json()

    # Official score and EXP MUST BE 100% and 50 EXP (unaffected by AI score 15%)
    assert submit_data["score"] == 100.0
    assert submit_data["xp_earned"] == 50
    assert submit_data["ai_feedback"]["similarity_score"] == 15.0


@pytest.mark.asyncio
async def test_submit_shadowing_succeeds_even_when_ai_gateway_fails(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    """Verifies that if AI Gateway fails or times out, practice completion and EXP still succeed."""
    from app.api.dependencies.ai import get_ai_gateway

    user = await create_test_user(db_session, email="ai_shadowing_fault_tolerance@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-ai-fault-tolerance")
    content.audio_duration_ms = 10000
    await db_session.flush()

    class FailingAiGateway:
        async def transcribe(self, **kwargs):
            raise RuntimeError("Whisper STT Service Timeout / Outage")

        async def evaluate_shadowing(self, **kwargs):
            raise RuntimeError("LLM Evaluation Outage")

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_ai_gateway] = lambda: FailingAiGateway()

    audio_bytes = b"fake_audio_stream_data_sample" * 500
    files = {"audio_file": ("continuous.webm", BytesIO(audio_bytes), "audio/webm")}
    res_rec = await client.post(
        f"/api/v1/shadowing/{content.id}/record-continuous",
        files=files,
        data={"duration_seconds": 10},
    )
    attempt_id = res_rec.json()["attempt_id"]

    res_submit = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0, "request_ai_review": True},
    )
    # Submission MUST succeed gracefully
    assert res_submit.status_code == 200
    submit_data = res_submit.json()
    assert submit_data["status"] == "completed"
    assert submit_data["score"] == 100.0
    assert submit_data["xp_earned"] == 50
    assert submit_data["ai_feedback"] is None


@pytest.mark.asyncio
async def test_continuous_mode_multiple_takes_evaluates_latest_recording(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    """Verifies that when a user re-records in Continuous Mode, the latest take is evaluated."""
    from app.api.dependencies.ai import get_ai_gateway

    user = await create_test_user(db_session, email="continuous_rerecord@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-continuous-rerecord")
    content.audio_duration_ms = 10000
    await db_session.flush()

    mock_ai = MockShadowingAiGateway(score=92, text="いらっしゃいませ。最新テイク。")
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_ai_gateway] = lambda: mock_ai

    # Take 1 (discarded short take)
    res_take1 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-continuous",
        files={"audio_file": ("take1.webm", BytesIO(b"take1" * 100), "audio/webm")},
        data={"duration_seconds": 2},
    )
    assert res_take1.status_code == 201
    attempt_id = res_take1.json()["attempt_id"]

    # Take 2 (active take)
    res_take2 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-continuous",
        files={"audio_file": ("take2.webm", BytesIO(b"take2" * 500), "audio/webm")},
        data={"duration_seconds": 10, "attempt_id": attempt_id},
    )
    assert res_take2.status_code == 201
    latest_recording_id = res_take2.json()["recording_id"]

    # Submit attempt with AI review requested
    res_submit = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0, "request_ai_review": True},
    )
    assert res_submit.status_code == 200
    submit_data = res_submit.json()
    assert submit_data["ai_feedback"] is not None
    assert submit_data["ai_feedback"]["similarity_score"] == 92.0
    assert submit_data["ai_feedback"]["user_transcript"] == "いらっしゃいませ。最新テイク。"

    # Check that latest recording was updated
    latest_rec = await db_session.scalar(
        select(Recording).where(Recording.id == uuid.UUID(latest_recording_id))
    )
    assert latest_rec is not None
    assert latest_rec.transcription_ja == "いらっしゃいませ。最新テイク。"

    # Review returns latest take
    res_review = await client.get(f"/api/v1/shadowing/attempts/{attempt_id}/review")
    assert res_review.status_code == 200
    rev_data = res_review.json()
    assert rev_data["ai_feedback"] is not None
    assert rev_data["user_continuous_transcript"] == "いらっしゃいませ。最新テイク。"


@pytest.mark.asyncio
async def test_continuous_mode_empty_speech_generates_graceful_feedback(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    """Verifies that silent or unrecognized audio produces friendly pedagogical feedback."""
    from app.api.dependencies.ai import get_ai_gateway

    user = await create_test_user(db_session, email="continuous_silent@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-continuous-silent")
    content.audio_duration_ms = 10000
    await db_session.flush()

    mock_ai = MockShadowingAiGateway(score=0, text="")  # STT returns empty text
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_ai_gateway] = lambda: mock_ai

    res_rec = await client.post(
        f"/api/v1/shadowing/{content.id}/record-continuous",
        files={"audio_file": ("continuous.webm", BytesIO(b"silence" * 500), "audio/webm")},
        data={"duration_seconds": 10},
    )
    attempt_id = res_rec.json()["attempt_id"]

    res_submit = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0, "request_ai_review": True},
    )
    assert res_submit.status_code == 200
    submit_data = res_submit.json()

    # Informational feedback should provide helpful advice rather than being null
    assert submit_data["ai_feedback"] is not None
    assert submit_data["ai_feedback"]["similarity_score"] == 0.0
    assert "Không nhận diện được giọng nói" in submit_data["ai_feedback"]["feedback"]
    assert len(submit_data["ai_feedback"]["hints"]) > 0

    # Official score remains intact
    assert submit_data["score"] == 100.0
    assert submit_data["xp_earned"] == 50


@pytest.mark.asyncio
async def test_finish_without_ai_review_does_not_trigger_ai_evaluation(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    """Verifies that when user selects Finish without AI Review, AI is never invoked."""
    from app.api.dependencies.ai import get_ai_gateway

    user = await create_test_user(db_session, email="no_ai_review@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-no-ai-review")
    content.audio_duration_ms = 10000
    await db_session.flush()

    class StrictlyUnusedAiGateway:
        async def transcribe(self, **kwargs):
            pytest.fail("transcribe should not be called when request_ai_review is False")

        async def evaluate_shadowing(self, **kwargs):
            pytest.fail("evaluate_shadowing should not be called when request_ai_review is False")

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_ai_gateway] = lambda: StrictlyUnusedAiGateway()

    # Continuous take
    files = {"audio_file": ("continuous.webm", BytesIO(b"audio" * 500), "audio/webm")}
    res_rec = await client.post(
        f"/api/v1/shadowing/{content.id}/record-continuous",
        files=files,
        data={"duration_seconds": 10},
    )
    assert res_rec.status_code == 201
    attempt_id = res_rec.json()["attempt_id"]

    # Submit without AI review (request_ai_review: False)
    res_submit = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0, "request_ai_review": False},
    )
    assert res_submit.status_code == 200
    submit_data = res_submit.json()

    assert submit_data["status"] == "completed"
    assert submit_data["score"] == 100.0
    assert submit_data["xp_earned"] == 50
    assert submit_data["ai_feedback"] is None


@pytest.mark.asyncio
async def test_segmented_mode_optional_ai_review(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    """Verifies that Segment Mode respects request_ai_review parameter."""
    from app.api.dependencies.ai import get_ai_gateway

    user = await create_test_user(db_session, email="segmented_ai_choice@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-segmented-choice")
    await db_session.flush()

    mock_ai = MockShadowingAiGateway(score=95, text="いらっしゃいませ。")
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_ai_gateway] = lambda: mock_ai

    # Record segment 0 (sufficient bytes for >= 2s duration)
    res_seg0 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("seg0.webm", BytesIO(b"0" * 40000), "audio/webm")},
        data={"segment_id": "0"},
    )
    assert res_seg0.status_code == 201
    attempt_id = res_seg0.json()["attempt_id"]

    # Submit with request_ai_review: True
    res_submit = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0, "request_ai_review": True},
    )
    assert res_submit.status_code == 200
    submit_data = res_submit.json()
    assert submit_data["score"] == 50.0
    assert submit_data["ai_feedback"] is not None
    assert submit_data["ai_feedback"]["similarity_score"] == 95.0


@pytest.mark.asyncio
async def test_segmented_mode_without_ai_review_skips_ai_evaluation(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    """Verifies that Segment Mode skips AI evaluation when request_ai_review is False."""
    from app.api.dependencies.ai import get_ai_gateway

    user = await create_test_user(db_session, email="segmented_no_ai@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-segmented-no-ai")
    await db_session.flush()

    class StrictlyUnusedAiGateway:
        async def transcribe(self, **kwargs):
            pytest.fail("transcribe should not be called when request_ai_review is False")

        async def evaluate_shadowing(self, **kwargs):
            pytest.fail("evaluate_shadowing should not be called when request_ai_review is False")

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_ai_gateway] = lambda: StrictlyUnusedAiGateway()

    # Record segment 0
    res_seg0 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("seg0.webm", BytesIO(b"0" * 40000), "audio/webm")},
        data={"segment_id": "0"},
    )
    assert res_seg0.status_code == 201
    attempt_id = res_seg0.json()["attempt_id"]

    # Submit with request_ai_review: False
    res_submit = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0, "request_ai_review": False},
    )
    assert res_submit.status_code == 200
    submit_data = res_submit.json()
    assert submit_data["score"] == 50.0
    assert submit_data["ai_feedback"] is None


@pytest.mark.asyncio
async def test_segmented_mode_multiple_segments_with_ai_review(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    """Verifies that multiple segments are transcribed safely and evaluated together."""
    from app.api.dependencies.ai import get_ai_gateway
    from app.models.attempt import AiEvaluation

    user = await create_test_user(db_session, email="segmented_multi_ai@example.com")
    content = await create_shadowing_content(
        db_session,
        slug="shadowing-segmented-multi-ai",
        transcript_ja=[
            {"start_time_ms": 0, "end_time_ms": 3000, "script": "いらっしゃいませ。"},
            {"start_time_ms": 3000, "end_time_ms": 6000, "script": "何をお探しですか？"},
        ],
    )
    await db_session.flush()

    mock_ai = MockShadowingAiGateway(score=92, text="いらっしゃいませ。何をお探しですか？")
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_ai_gateway] = lambda: mock_ai

    # Record Segment 0
    res_seg0 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("seg0.webm", BytesIO(b"0" * 40000), "audio/webm")},
        data={"segment_id": "0"},
    )
    assert res_seg0.status_code == 201
    attempt_id = res_seg0.json()["attempt_id"]

    # Record Segment 1
    res_seg1 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("seg1.webm", BytesIO(b"0" * 40000), "audio/webm")},
        data={"segment_id": "1", "attempt_id": attempt_id},
    )
    assert res_seg1.status_code == 201

    # Submit with AI review
    res_submit = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0, "request_ai_review": True},
    )
    assert res_submit.status_code == 200
    submit_data = res_submit.json()
    assert submit_data["status"] == "completed"
    assert submit_data["score"] == 100.0
    assert submit_data["xp_earned"] == 50
    assert submit_data["ai_feedback"] is not None
    assert submit_data["ai_feedback"]["similarity_score"] == 92.0

    # Verify AiEvaluation in DB
    ai_eval = await db_session.scalar(
        select(AiEvaluation).where(AiEvaluation.attempt_id == uuid.UUID(attempt_id))
    )
    assert ai_eval is not None
    assert ai_eval.similarity_score == Decimal("92.00")

    # Verify Review endpoint
    res_review = await client.get(f"/api/v1/shadowing/attempts/{attempt_id}/review")
    assert res_review.status_code == 200
    review_data = res_review.json()
    assert review_data["ai_feedback"] is not None
    assert review_data["ai_feedback"]["similarity_score"] == 92.0
    assert review_data["completed_segments"] == 2


@pytest.mark.asyncio
async def test_segmented_mode_empty_speech_generates_graceful_feedback(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    """Verifies that empty speech in segment mode provides friendly fallback feedback."""
    from app.api.dependencies.ai import get_ai_gateway

    user = await create_test_user(db_session, email="segmented_silent@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-segmented-silent")
    await db_session.flush()

    mock_ai = MockShadowingAiGateway(score=0, text="")
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_ai_gateway] = lambda: mock_ai

    res_seg0 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("seg0.webm", BytesIO(b"0" * 40000), "audio/webm")},
        data={"segment_id": "0"},
    )
    assert res_seg0.status_code == 201
    attempt_id = res_seg0.json()["attempt_id"]

    res_submit = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0, "request_ai_review": True},
    )
    assert res_submit.status_code == 200
    submit_data = res_submit.json()
    assert submit_data["score"] == 50.0
    assert submit_data["ai_feedback"] is not None
    assert submit_data["ai_feedback"]["similarity_score"] == 0.0
    assert "Không nhận diện được giọng nói" in submit_data["ai_feedback"]["feedback"]


def test_parse_json_content_handles_markdown_code_fences():
    from app.integrations.ai.contracts import parse_json_content

    # Plain JSON
    assert parse_json_content('{"key": "value"}') == {"key": "value"}

    # Markdown json fence
    fenced = '```json\n{"score": 85, "is_acceptable": true}\n```'
    assert parse_json_content(fenced) == {"score": 85, "is_acceptable": True}

    # Markdown fence without language
    fenced_no_lang = '```\n{"score": 90}\n```'
    assert parse_json_content(fenced_no_lang) == {"score": 90}

    # Markdown fence with leading/trailing commentary
    fenced_with_text = (
        'Here is the evaluation result:\n```json\n{"score": 75}\n```\nHope this helps!'
    )
    assert parse_json_content(fenced_with_text) == {"score": 75}


@pytest.mark.asyncio
async def test_in_progress_attempt_returns_playback_urls_for_all_recorded_segments(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    """Verifies that in-progress attempt endpoint returns valid playback URLs for restoration."""
    from app.api.dependencies.ai import get_ai_gateway

    user = await create_test_user(db_session, email="in_prog_urls@example.com")
    content = await create_shadowing_content(
        db_session,
        slug="shadowing-in-prog-urls",
        transcript_ja=[
            {"start_time_ms": 0, "end_time_ms": 3000, "script": "おはようございます。"},
            {"start_time_ms": 3000, "end_time_ms": 6000, "script": "お元気ですか？"},
        ],
    )
    await db_session.flush()

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_ai_gateway] = lambda: MockShadowingAiGateway()

    # Record segment 0
    res_seg0 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("seg0.webm", BytesIO(b"0" * 40000), "audio/webm")},
        data={"segment_id": "0"},
    )
    assert res_seg0.status_code == 201
    attempt_id = res_seg0.json()["attempt_id"]

    # Query in-progress
    res_in_prog = await client.get(f"/api/v1/shadowing/{content.id}/in-progress")
    assert res_in_prog.status_code == 200
    in_prog_data = res_in_prog.json()
    assert in_prog_data["attempt_id"] == attempt_id
    assert len(in_prog_data["recorded_segments"]) == 1
    seg_summary = in_prog_data["recorded_segments"][0]
    assert seg_summary["segment_id"] == "0"
    assert seg_summary["playback_url"] is not None
    assert seg_summary["playback_url"].startswith("http")


@pytest.mark.asyncio
async def test_in_progress_continuous_returns_playback_url(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    """Verifies that continuous in-progress attempt returns playback URL."""
    from app.api.dependencies.ai import get_ai_gateway

    user = await create_test_user(db_session, email="in_prog_cont_urls@example.com")
    content = await create_shadowing_content(db_session, slug="shadowing-in-prog-cont-urls")
    await db_session.flush()

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_ai_gateway] = lambda: MockShadowingAiGateway()

    res_cont = await client.post(
        f"/api/v1/shadowing/{content.id}/record-continuous",
        files={"audio_file": ("cont.webm", BytesIO(b"0" * 40000), "audio/webm")},
        data={"duration_seconds": 10},
    )
    assert res_cont.status_code == 201
    attempt_id = res_cont.json()["attempt_id"]

    res_in_prog = await client.get(f"/api/v1/shadowing/{content.id}/in-progress")
    assert res_in_prog.status_code == 200
    in_prog_data = res_in_prog.json()
    assert in_prog_data["attempt_id"] == attempt_id
    assert in_prog_data["mode"] == "continuous"
    assert in_prog_data["continuous_recording"] is not None
    assert in_prog_data["continuous_recording"]["playback_url"] is not None


@pytest.mark.asyncio
async def test_resume_and_submit_attempt_with_ai_review(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    """Verifies resuming an in-progress attempt and finishing with AI review."""
    from app.api.dependencies.ai import get_ai_gateway

    user = await create_test_user(db_session, email="resume_with_ai@example.com")
    content = await create_shadowing_content(
        db_session,
        slug="shadowing-resume-ai",
        transcript_ja=[
            {"start_time_ms": 0, "end_time_ms": 3000, "script": "おはよう。"},
            {"start_time_ms": 3000, "end_time_ms": 6000, "script": "また明日。"},
        ],
    )
    await db_session.flush()

    mock_ai = MockShadowingAiGateway(score=95, text="おはよう。また明日。")
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_ai_gateway] = lambda: mock_ai

    # Session 1: Record segment 0
    res_seg0 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("seg0.webm", BytesIO(b"0" * 40000), "audio/webm")},
        data={"segment_id": "0"},
    )
    assert res_seg0.status_code == 201
    attempt_id = res_seg0.json()["attempt_id"]

    # Session 2 (Resumed): Record segment 1 using attempt_id
    res_seg1 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("seg1.webm", BytesIO(b"0" * 40000), "audio/webm")},
        data={"segment_id": "1", "attempt_id": attempt_id},
    )
    assert res_seg1.status_code == 201

    # Submit resumed attempt with AI review
    res_submit = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0, "request_ai_review": True},
    )
    assert res_submit.status_code == 200
    submit_data = res_submit.json()
    assert submit_data["status"] == "completed"
    assert submit_data["score"] == 100.0
    assert submit_data["xp_earned"] == 50
    assert submit_data["ai_feedback"] is not None
    assert submit_data["ai_feedback"]["similarity_score"] == 95.0


@pytest.mark.asyncio
async def test_segment_recording_assignment_skipped_segments_remain_unrecorded(
    client: httpx.AsyncClient, db_session: AsyncSession
):
    """Verifies that skipping Segment 0 and recording Segment 1 leaves Segment 0 unrecorded."""
    from app.api.dependencies.ai import get_ai_gateway

    user = await create_test_user(db_session, email="skip_seg0@example.com")
    content = await create_shadowing_content(
        db_session,
        slug="shadowing-skip-seg0",
        transcript_ja=[
            {"start_time_ms": 0, "end_time_ms": 3000, "script": "最初の文。"},
            {"start_time_ms": 3000, "end_time_ms": 6000, "script": "二番目の文。"},
            {"start_time_ms": 6000, "end_time_ms": 9000, "script": "三番目の文。"},
        ],
    )
    await db_session.flush()

    mock_ai = MockShadowingAiGateway(score=88, text="二番目の文。")
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_ai_gateway] = lambda: mock_ai

    # Record ONLY Segment 1 (skipping Segment 0 and Segment 2)
    res_seg1 = await client.post(
        f"/api/v1/shadowing/{content.id}/record-segment",
        files={"audio_file": ("seg1.webm", BytesIO(b"0" * 40000), "audio/webm")},
        data={"segment_id": "1"},
    )
    assert res_seg1.status_code == 201
    attempt_id = res_seg1.json()["attempt_id"]
    recording_id_1 = res_seg1.json()["recording_id"]

    # Submit attempt
    res_submit = await client.post(
        f"/api/v1/shadowing/{content.id}/submit",
        json={"attempt_id": attempt_id, "replay_count": 0, "request_ai_review": False},
    )
    assert res_submit.status_code == 200
    submit_data = res_submit.json()
    # 1 of 3 completed -> score = round(1/3 * 100, 2) = 33.33
    assert submit_data["score"] == 33.33

    # Review attempt: verify Segment 0 and Segment 2 are NOT recorded!
    res_review = await client.get(f"/api/v1/shadowing/attempts/{attempt_id}/review")
    assert res_review.status_code == 200
    review_data = res_review.json()
    assert review_data["total_segments"] == 3
    assert review_data["completed_segments"] == 1

    segments = review_data["segments"]
    assert len(segments) == 3

    # Segment 0: Skipped
    assert segments[0]["segment_index"] == 0
    assert segments[0]["recorded"] is False
    assert segments[0]["recording_id"] is None
    assert segments[0]["playback_url"] is None

    # Segment 1: Recorded
    assert segments[1]["segment_index"] == 1
    assert segments[1]["recorded"] is True
    assert segments[1]["recording_id"] == recording_id_1
    assert segments[1]["playback_url"] is not None

    # Segment 2: Skipped
    assert segments[2]["segment_index"] == 2
    assert segments[2]["recorded"] is False
    assert segments[2]["recording_id"] is None
    assert segments[2]["playback_url"] is None
