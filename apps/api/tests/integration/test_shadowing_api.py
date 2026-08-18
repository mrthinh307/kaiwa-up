import uuid
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
from app.models.user import User


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
