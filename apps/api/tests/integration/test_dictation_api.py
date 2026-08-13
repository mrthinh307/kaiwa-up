import uuid

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.main import app
from app.models.attempt import ExerciseAttempt
from app.models.content import LearningContent
from app.models.enums import AttemptStatus, ContentStatus, ContentType, JlptLevel
from app.models.user import User


async def create_user(session: AsyncSession, *, email: str) -> User:
    user = User(email=email, password_hash="password-hash", display_name="Dictation User")
    session.add(user)
    await session.flush()
    return user


async def create_dictation_content(
    session: AsyncSession,
    *,
    slug: str,
    transcript_ja: list[dict[str, object]] | None = None,
    audio_url: str | None = "https://example.com/dictation.mp3",
) -> LearningContent:
    stored_transcript = (
        transcript_ja
        if transcript_ja is not None
        else [
            {
                "start_time_ms": 0,
                "end_time_ms": 12000,
                "script": "明日の会議の資料ですが、",
            },
            {
                "start_time_ms": 12000,
                "end_time_ms": 25000,
                "script": "今日の夕方までに準備しておきます。",
            },
        ]
    )
    content = LearningContent(
        content_type=ContentType.SHADOWING_DICTATION,
        status=ContentStatus.PUBLISHED,
        slug=slug,
        title="Office dictation",
        difficulty=JlptLevel.N3,
        audio_url=audio_url,
        transcript_ja=stored_transcript,
        base_exp=50,
    )
    session.add(content)
    await session.flush()
    return content


def set_current_user(user: User) -> None:
    async def _current_user() -> User:
        return user

    app.dependency_overrides[get_current_user] = _current_user


@pytest.mark.asyncio
async def test_start_dictation_attempt_creates_in_progress_attempt_without_exposing_script(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="dictation@example.com")
    content = await create_dictation_content(db_session, slug="office-dictation")
    set_current_user(user)

    response = await client.post(f"/api/v1/dictation/{content.id}/start")

    assert response.status_code == 201
    payload = response.json()
    assert uuid.UUID(payload["attempt_id"]).version == 7
    assert payload == {
        "attempt_id": payload["attempt_id"],
        "content_id": str(content.id),
        "attempt_number": 1,
        "audio_url": "https://example.com/dictation.mp3",
        "total_segments": 2,
        "segments": [
            {"segment_index": 0, "start_time_ms": 0, "end_time_ms": 12000},
            {"segment_index": 1, "start_time_ms": 12000, "end_time_ms": 25000},
        ],
    }
    assert "script" not in response.text
    assert "明日の会議の資料ですが" not in response.text

    attempt = await db_session.scalar(
        select(ExerciseAttempt).where(ExerciseAttempt.id == uuid.UUID(payload["attempt_id"]))
    )
    assert attempt is not None
    assert attempt.user_id == user.id
    assert attempt.content_id == content.id
    assert attempt.attempt_number == 1
    assert attempt.status == AttemptStatus.IN_PROGRESS
    assert attempt.answer_payload == {}


@pytest.mark.asyncio
async def test_start_dictation_attempt_increments_attempt_number(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="repeat@example.com")
    content = await create_dictation_content(db_session, slug="repeat-dictation")
    set_current_user(user)

    first_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    second_response = await client.post(f"/api/v1/dictation/{content.id}/start")

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert first_response.json()["attempt_number"] == 1
    assert second_response.json()["attempt_number"] == 2
    assert first_response.json()["attempt_id"] != second_response.json()["attempt_id"]


@pytest.mark.asyncio
async def test_start_dictation_attempt_requires_authentication(
    client: httpx.AsyncClient,
) -> None:
    response = await client.post(f"/api/v1/dictation/{uuid.uuid4()}/start")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


@pytest.mark.asyncio
async def test_start_dictation_attempt_returns_not_found_for_unknown_content(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="missing@example.com")
    set_current_user(user)

    response = await client.post(f"/api/v1/dictation/{uuid.uuid4()}/start")

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Dictation content not found"


@pytest.mark.asyncio
async def test_start_dictation_attempt_rejects_invalid_transcript_configuration(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="invalid@example.com")
    content = await create_dictation_content(
        db_session,
        slug="invalid-dictation",
        transcript_ja=[
            {
                "start_time_ms": 5000,
                "end_time_ms": 1000,
                "script": "無効な区間",
            }
        ],
    )
    set_current_user(user)

    response = await client.post(f"/api/v1/dictation/{content.id}/start")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "dictation_content_unavailable"
    attempts = (
        await db_session.scalars(
            select(ExerciseAttempt).where(ExerciseAttempt.content_id == content.id)
        )
    ).all()
    assert attempts == []


@pytest.mark.asyncio
async def test_check_dictation_segment_returns_feedback_and_persists_answer(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="segment-check@example.com")
    content = await create_dictation_content(db_session, slug="segment-check")
    set_current_user(user)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt_id = start_response.json()["attempt_id"]

    response = await client.post(
        "/api/v1/dictation/segments/check",
        json={
            "attempt_id": attempt_id,
            "segment_index": 0,
            "user_answer": " 明日の 会議の資料ですが ",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "segment_index": 0,
        "is_correct": True,
        "user_answer": " 明日の 会議の資料ですが ",
        "correct_script": "明日の会議の資料ですが、",
        "is_last_segment": False,
    }
    attempt = await db_session.get(ExerciseAttempt, uuid.UUID(attempt_id))
    assert attempt is not None
    assert attempt.status == AttemptStatus.IN_PROGRESS
    assert attempt.answer_payload == {"segments": [response.json()]}


@pytest.mark.asyncio
async def test_check_dictation_segment_replaces_previous_answer_and_marks_last_segment(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="segment-retry@example.com")
    content = await create_dictation_content(db_session, slug="segment-retry")
    set_current_user(user)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt_id = start_response.json()["attempt_id"]

    incorrect_response = await client.post(
        "/api/v1/dictation/segments/check",
        json={"attempt_id": attempt_id, "segment_index": 1, "user_answer": "不正解"},
    )
    assert incorrect_response.status_code == 200
    assert incorrect_response.json()["is_correct"] is False
    response = await client.post(
        "/api/v1/dictation/segments/check",
        json={
            "attempt_id": attempt_id,
            "segment_index": 1,
            "user_answer": "今日の夕方までに準備しておきます",
        },
    )

    assert response.status_code == 200
    assert response.json()["is_correct"] is True
    assert response.json()["is_last_segment"] is True
    attempt = await db_session.get(ExerciseAttempt, uuid.UUID(attempt_id))
    assert attempt is not None
    assert attempt.answer_payload == {"segments": [response.json()]}


@pytest.mark.asyncio
async def test_check_dictation_segment_rejects_out_of_range_index(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="invalid-index@example.com")
    content = await create_dictation_content(db_session, slug="invalid-index")
    set_current_user(user)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt_id = start_response.json()["attempt_id"]

    response = await client.post(
        "/api/v1/dictation/segments/check",
        json={"attempt_id": attempt_id, "segment_index": 2, "user_answer": "回答"},
    )

    assert response.status_code == 400
    assert response.json()["error"] == {
        "status": 400,
        "code": "invalid_segment_index",
        "message": "Segment index is outside the Dictation transcript",
        "details": {"segment_index": 2, "total_segments": 2},
    }
    attempt = await db_session.get(ExerciseAttempt, uuid.UUID(attempt_id))
    assert attempt is not None
    assert attempt.answer_payload == {}


@pytest.mark.asyncio
async def test_check_dictation_segment_rejects_attempt_owned_by_another_user(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    owner = await create_user(db_session, email="segment-owner@example.com")
    content = await create_dictation_content(db_session, slug="segment-owner")
    set_current_user(owner)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    other_user = await create_user(db_session, email="segment-other@example.com")
    set_current_user(other_user)

    response = await client.post(
        "/api/v1/dictation/segments/check",
        json={
            "attempt_id": start_response.json()["attempt_id"],
            "segment_index": 0,
            "user_answer": "回答",
        },
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_check_dictation_segment_rejects_completed_attempt(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="segment-completed@example.com")
    content = await create_dictation_content(db_session, slug="segment-completed")
    set_current_user(user)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt = await db_session.get(
        ExerciseAttempt,
        uuid.UUID(start_response.json()["attempt_id"]),
    )
    assert attempt is not None
    attempt.status = AttemptStatus.COMPLETED
    await db_session.commit()

    response = await client.post(
        "/api/v1/dictation/segments/check",
        json={
            "attempt_id": str(attempt.id),
            "segment_index": 0,
            "user_answer": "回答",
        },
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "dictation_attempt_not_in_progress"
