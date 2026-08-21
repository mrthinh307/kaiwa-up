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
from app.models.gamification import XpTransaction
from app.models.user import User, UserProgress
from app.repositories.dictation import DictationRepository
from app.services.dictation import DictationService
from app.services.gamification import GamificationService


async def create_user(session: AsyncSession, *, email: str) -> User:
    user = User(email=email, password_hash="password-hash", display_name="Dictation User")
    session.add(user)
    await session.flush()
    return user


async def create_dictation_content(
    session: AsyncSession,
    *,
    slug: str,
    title: str = "Office dictation",
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
        title=title,
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
async def test_resume_dictation_attempt_restores_latest_checked_segments(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="resume@example.com")
    content = await create_dictation_content(db_session, slug="resume-dictation")
    set_current_user(user)
    first_start = await client.post(f"/api/v1/dictation/{content.id}/start")
    latest_start = await client.post(f"/api/v1/dictation/{content.id}/start")
    latest_attempt_id = latest_start.json()["attempt_id"]
    checked_response = await client.post(
        "/api/v1/dictation/segments/check",
        json={
            "attempt_id": latest_attempt_id,
            "segment_index": 0,
            "user_answer": "明日の会議の資料ですが",
        },
    )

    response = await client.get(f"/api/v1/dictation/{content.id}/in-progress")

    assert first_start.status_code == 201
    assert latest_start.status_code == 201
    assert checked_response.status_code == 200
    assert response.status_code == 200
    assert response.json() == {
        "attempt_id": latest_attempt_id,
        "content_id": str(content.id),
        "attempt_number": 2,
        "audio_url": "https://example.com/dictation.mp3",
        "total_segments": 2,
        "segments": [
            {"segment_index": 0, "start_time_ms": 0, "end_time_ms": 12000},
            {"segment_index": 1, "start_time_ms": 12000, "end_time_ms": 25000},
        ],
        "checked_segments": [checked_response.json()],
    }


@pytest.mark.asyncio
async def test_resume_dictation_attempt_returns_not_found_for_other_user(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    owner = await create_user(db_session, email="resume-owner@example.com")
    other_user = await create_user(db_session, email="resume-other@example.com")
    content = await create_dictation_content(db_session, slug="private-resume")
    set_current_user(owner)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    set_current_user(other_user)

    response = await client.get(f"/api/v1/dictation/{content.id}/in-progress")

    assert start_response.status_code == 201
    assert response.status_code == 404
    assert response.json()["error"]["message"] == "In-progress Dictation attempt not found"


@pytest.mark.asyncio
async def test_resume_dictation_attempt_ignores_completed_attempt(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="resume-completed@example.com")
    content = await create_dictation_content(db_session, slug="completed-resume")
    set_current_user(user)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt_id = start_response.json()["attempt_id"]
    complete_response = await client.post(
        "/api/v1/dictation/complete",
        json={"attempt_id": attempt_id},
    )

    response = await client.get(f"/api/v1/dictation/{content.id}/in-progress")

    assert complete_response.status_code == 200
    assert response.status_code == 404


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

    review_response = await client.get(f"/api/v1/dictation/attempts/{attempt_id}")

    assert review_response.status_code == 200
    assert review_response.json()["status"] == "in_progress"
    assert review_response.json()["score"] is None
    assert review_response.json()["earned_exp"] == 0
    assert review_response.json()["details"] == [
        {
            "segment_index": 0,
            "user_answer": " 明日の 会議の資料ですが ",
            "correct_script": "明日の会議の資料ですが、",
            "is_correct": True,
        }
    ]
    assert "今日の夕方までに準備しておきます" not in review_response.text


@pytest.mark.asyncio
async def test_check_dictation_segment_accepts_hiragana_for_a_kanji_transcript(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="segment-check-hiragana@example.com")
    content = await create_dictation_content(db_session, slug="segment-check-hiragana")
    set_current_user(user)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt_id = start_response.json()["attempt_id"]

    response = await client.post(
        "/api/v1/dictation/segments/check",
        json={
            "attempt_id": attempt_id,
            "segment_index": 0,
            "user_answer": "あしたのかいぎのしりょうですが",
        },
    )

    assert response.status_code == 200
    assert response.json()["is_correct"] is True


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


@pytest.mark.asyncio
async def test_complete_dictation_attempt_scores_awards_exp_and_supports_review(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="complete@example.com")
    content = await create_dictation_content(db_session, slug="complete-dictation")
    set_current_user(user)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt_id = start_response.json()["attempt_id"]
    await client.post(
        "/api/v1/dictation/segments/check",
        json={
            "attempt_id": attempt_id,
            "segment_index": 0,
            "user_answer": "明日の会議の資料ですが",
        },
    )
    await client.post(
        "/api/v1/dictation/segments/check",
        json={"attempt_id": attempt_id, "segment_index": 1, "user_answer": "不正解"},
    )

    response = await client.post(
        "/api/v1/dictation/complete",
        json={"attempt_id": attempt_id},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        "attempt_id": attempt_id,
        "status": "completed",
        "score": 50.0,
        "correct_count": 1,
        "total_count": 2,
        "earned_exp": 50,
        "completed_at": payload["completed_at"],
    }
    attempt = await db_session.get(ExerciseAttempt, uuid.UUID(attempt_id))
    assert attempt is not None
    assert attempt.status == AttemptStatus.COMPLETED
    assert float(attempt.score or 0) == 50.0
    assert attempt.correct_count == 1
    assert attempt.total_count == 2
    assert attempt.submitted_at is not None
    assert attempt.completed_at is not None
    progress = await db_session.get(UserProgress, user.id)
    assert progress is not None
    assert progress.total_exp == 50
    transactions = (
        await db_session.scalars(
            select(XpTransaction).where(XpTransaction.attempt_id == uuid.UUID(attempt_id))
        )
    ).all()
    assert len(transactions) == 1
    assert transactions[0].amount == 50

    review_response = await client.get(f"/api/v1/dictation/attempts/{attempt_id}")

    assert review_response.status_code == 200
    assert review_response.json() == {
        "attempt_id": attempt_id,
        "status": "completed",
        "score": 50.0,
        "earned_exp": 50,
        "details": [
            {
                "segment_index": 0,
                "user_answer": "明日の会議の資料ですが",
                "correct_script": "明日の会議の資料ですが、",
                "is_correct": True,
            },
            {
                "segment_index": 1,
                "user_answer": "不正解",
                "correct_script": "今日の夕方までに準備しておきます。",
                "is_correct": False,
            },
        ],
    }


@pytest.mark.asyncio
async def test_complete_dictation_attempt_counts_unanswered_segments_as_incorrect(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="early-submit@example.com")
    content = await create_dictation_content(db_session, slug="early-submit")
    set_current_user(user)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt_id = start_response.json()["attempt_id"]
    await client.post(
        "/api/v1/dictation/segments/check",
        json={
            "attempt_id": attempt_id,
            "segment_index": 0,
            "user_answer": "明日の会議の資料ですが",
        },
    )

    response = await client.post(
        "/api/v1/dictation/complete",
        json={"attempt_id": attempt_id},
    )

    assert response.status_code == 200
    assert response.json()["correct_count"] == 1
    assert response.json()["total_count"] == 2
    assert response.json()["score"] == 50.0
    assert response.json()["earned_exp"] == 40
    transaction = await db_session.scalar(
        select(XpTransaction).where(XpTransaction.attempt_id == uuid.UUID(attempt_id))
    )
    assert transaction is not None
    assert transaction.amount == 40

    review_response = await client.get(f"/api/v1/dictation/attempts/{attempt_id}")

    assert review_response.status_code == 200
    assert review_response.json()["details"][1] == {
        "segment_index": 1,
        "user_answer": "",
        "correct_script": "今日の夕方までに準備しておきます。",
        "is_correct": False,
    }


@pytest.mark.asyncio
async def test_complete_dictation_attempt_awards_exp_for_completion_percentage(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="completion-exp@example.com")
    content = await create_dictation_content(
        db_session,
        slug="completion-exp",
        transcript_ja=[
            {
                "start_time_ms": segment_index * 1_000,
                "end_time_ms": (segment_index + 1) * 1_000,
                "script": f"文{segment_index}",
            }
            for segment_index in range(25)
        ],
    )
    set_current_user(user)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt_id = uuid.UUID(start_response.json()["attempt_id"])
    await client.post(
        "/api/v1/dictation/segments/check",
        json={"attempt_id": str(attempt_id), "segment_index": 0, "user_answer": "文0"},
    )

    response = await client.post(
        "/api/v1/dictation/complete",
        json={"attempt_id": str(attempt_id)},
    )

    assert response.status_code == 200
    assert response.json()["earned_exp"] == 5
    progress = await db_session.get(UserProgress, user.id)
    assert progress is not None
    assert progress.total_exp == 5
    transaction = await db_session.scalar(
        select(XpTransaction).where(XpTransaction.attempt_id == attempt_id)
    )
    assert transaction is not None
    assert transaction.amount == 5


@pytest.mark.asyncio
async def test_complete_dictation_attempt_without_checked_segments_awards_no_exp(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="empty-complete@example.com")
    content = await create_dictation_content(db_session, slug="empty-complete")
    set_current_user(user)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt_id = uuid.UUID(start_response.json()["attempt_id"])

    response = await client.post(
        "/api/v1/dictation/complete",
        json={"attempt_id": str(attempt_id)},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    assert response.json()["score"] == 0.0
    assert response.json()["correct_count"] == 0
    assert response.json()["earned_exp"] == 0
    assert (
        await db_session.scalar(select(XpTransaction).where(XpTransaction.attempt_id == attempt_id))
        is None
    )
    assert await db_session.get(UserProgress, user.id) is None

    review_response = await client.get(f"/api/v1/dictation/attempts/{attempt_id}")

    assert review_response.status_code == 200
    assert review_response.json()["earned_exp"] == 0


@pytest.mark.asyncio
async def test_complete_dictation_attempt_with_blank_answer_awards_no_exp(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="blank-complete@example.com")
    content = await create_dictation_content(db_session, slug="blank-complete")
    set_current_user(user)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt_id = uuid.UUID(start_response.json()["attempt_id"])
    check_response = await client.post(
        "/api/v1/dictation/segments/check",
        json={"attempt_id": str(attempt_id), "segment_index": 0, "user_answer": "   "},
    )

    response = await client.post(
        "/api/v1/dictation/complete",
        json={"attempt_id": str(attempt_id)},
    )

    assert check_response.status_code == 200
    assert response.status_code == 200
    assert response.json()["earned_exp"] == 0
    assert (
        await db_session.scalar(select(XpTransaction).where(XpTransaction.attempt_id == attempt_id))
        is None
    )
    assert await db_session.get(UserProgress, user.id) is None


@pytest.mark.asyncio
async def test_complete_dictation_attempt_supports_maximum_length_content_title(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="long-title-complete@example.com")
    content = await create_dictation_content(
        db_session,
        slug="long-title-complete",
        title="長" * 255,
    )
    set_current_user(user)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt_id = start_response.json()["attempt_id"]
    await client.post(
        "/api/v1/dictation/segments/check",
        json={"attempt_id": attempt_id, "segment_index": 0, "user_answer": "回答"},
    )

    response = await client.post(
        "/api/v1/dictation/complete",
        json={"attempt_id": attempt_id},
    )

    assert response.status_code == 200
    transaction = await db_session.scalar(
        select(XpTransaction).where(XpTransaction.attempt_id == uuid.UUID(attempt_id))
    )
    assert transaction is not None
    assert transaction.reason is not None
    assert len(transaction.reason) == 100
    assert transaction.reason.startswith("Hoàn thành Shadowing Dictation: ")


@pytest.mark.asyncio
async def test_complete_dictation_attempt_rejects_duplicate_without_duplicate_exp(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(db_session, email="duplicate-complete@example.com")
    user_id = user.id
    content = await create_dictation_content(db_session, slug="duplicate-complete")
    set_current_user(user)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt_id = start_response.json()["attempt_id"]
    await client.post(
        "/api/v1/dictation/segments/check",
        json={"attempt_id": attempt_id, "segment_index": 0, "user_answer": "回答"},
    )

    first_response = await client.post(
        "/api/v1/dictation/complete",
        json={"attempt_id": attempt_id},
    )
    second_response = await client.post(
        "/api/v1/dictation/complete",
        json={"attempt_id": attempt_id},
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 409
    assert second_response.json()["error"]["code"] == "dictation_attempt_not_in_progress"
    transactions = (
        await db_session.scalars(
            select(XpTransaction).where(XpTransaction.attempt_id == uuid.UUID(attempt_id))
        )
    ).all()
    assert len(transactions) == 1
    progress = await db_session.get(UserProgress, user_id)
    assert progress is not None
    assert progress.total_exp == 40


@pytest.mark.asyncio
async def test_complete_and_review_dictation_attempt_enforce_ownership(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    owner = await create_user(db_session, email="complete-owner@example.com")
    content = await create_dictation_content(db_session, slug="complete-owner")
    set_current_user(owner)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt_id = start_response.json()["attempt_id"]
    other_user = await create_user(db_session, email="complete-other@example.com")
    set_current_user(other_user)

    complete_response = await client.post(
        "/api/v1/dictation/complete",
        json={"attempt_id": attempt_id},
    )
    review_response = await client.get(f"/api/v1/dictation/attempts/{attempt_id}")

    assert complete_response.status_code == 403
    assert complete_response.json()["error"]["code"] == "forbidden"
    assert review_response.status_code == 403
    assert review_response.json()["error"]["code"] == "forbidden"
    attempt = await db_session.get(ExerciseAttempt, uuid.UUID(attempt_id))
    assert attempt is not None
    assert attempt.status == AttemptStatus.IN_PROGRESS


@pytest.mark.asyncio
async def test_complete_dictation_attempt_rolls_back_when_exp_award_fails(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = await create_user(db_session, email="atomic-complete@example.com")
    content = await create_dictation_content(db_session, slug="atomic-complete")
    set_current_user(user)
    start_response = await client.post(f"/api/v1/dictation/{content.id}/start")
    attempt_id = uuid.UUID(start_response.json()["attempt_id"])
    await client.post(
        "/api/v1/dictation/segments/check",
        json={"attempt_id": str(attempt_id), "segment_index": 0, "user_answer": "回答"},
    )

    async def fail_award(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("simulated EXP failure")

    monkeypatch.setattr(
        GamificationService,
        "award_experience_in_transaction",
        fail_award,
    )
    service = DictationService(DictationRepository(db_session))

    with pytest.raises(RuntimeError, match="simulated EXP failure"):
        await service.complete_attempt(user_id=user.id, attempt_id=attempt_id)

    attempt = await db_session.get(ExerciseAttempt, attempt_id)
    assert attempt is not None
    assert attempt.status == AttemptStatus.IN_PROGRESS
    assert attempt.score is None
    assert attempt.completed_at is None
    assert (
        await db_session.scalar(select(XpTransaction).where(XpTransaction.attempt_id == attempt_id))
        is None
    )
