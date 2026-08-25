from datetime import UTC, datetime

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.ai import get_ai_gateway
from app.api.dependencies.auth import get_current_user
from app.exceptions.ai import AiTimeoutError
from app.integrations.ai.contracts import TranscriptionResult
from app.integrations.ai.providers.fake import FakeAiGateway
from app.main import app
from app.models.attempt import AiEvaluation, ExerciseAttempt, ReviewSchedule
from app.models.content import LearningContent, ReflexExercise
from app.models.enums import ContentStatus, ContentType, JlptLevel, PracticeMethod
from app.models.gamification import XpTransaction
from app.models.user import User, UserProgress


async def create_reflex_user(session: AsyncSession, email: str) -> User:
    user = User(email=email, password_hash="hash", display_name="Reflex User")
    session.add(user)
    await session.flush()
    return user


async def create_reflex_lesson(
    session: AsyncSession, *, slug: str, status: ContentStatus = ContentStatus.PUBLISHED
) -> LearningContent:
    content = LearningContent(
        content_type=ContentType.REFLEX,
        status=status,
        slug=slug,
        title="Greeting reflex",
        difficulty=JlptLevel.N5,
        audio_url="https://example.com/prompt.mp3",
        base_exp=50,
    )
    session.add(content)
    await session.flush()
    session.add(
        ReflexExercise(
            content_id=content.id,
            prompt_ja="お元気ですか？",
            scenario_ja="友達との会話",
            response_start_limit_seconds=3,
        )
    )
    await session.flush()
    return content


def override_reflex_dependencies(user: User) -> None:
    async def current_user() -> User:
        return user

    app.dependency_overrides[get_current_user] = current_user
    app.dependency_overrides[get_ai_gateway] = FakeAiGateway


@pytest.mark.asyncio
async def test_evaluate_reflex_persists_result_schedule_and_exp(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await create_reflex_user(db_session, "reflex-evaluate@example.com")
    content = await create_reflex_lesson(db_session, slug="reflex-evaluate")
    override_reflex_dependencies(user)

    response = await client.post(
        f"/api/v1/reflex/lessons/{content.id}/evaluate",
        data={"response_start_ms": "3000"},
        files={"audio_file": ("answer.mp3", b"ID3valid-audio", "audio/mpeg")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ai_score"] == 100
    assert payload["response_start_ms"] == 3000
    assert payload["is_on_time"] is True
    assert payload["next_review_days"] == 7
    assert payload["exp_earned"] == 50

    attempt = await db_session.scalar(
        select(ExerciseAttempt).where(ExerciseAttempt.content_id == content.id)
    )
    assert attempt is not None
    assert attempt.practice_method == PracticeMethod.REFLEX
    assert attempt.response_started_on_time is True
    assert await db_session.scalar(
        select(AiEvaluation).where(AiEvaluation.attempt_id == attempt.id)
    )
    schedule = await db_session.get(ReviewSchedule, (user.id, content.id))
    assert schedule is not None
    assert schedule.interval_days == 7
    assert schedule.last_attempt_id == attempt.id
    assert await db_session.scalar(
        select(XpTransaction).where(XpTransaction.attempt_id == attempt.id)
    )
    progress = await db_session.get(UserProgress, user.id)
    assert progress is not None
    assert progress.total_exp == 50
    assert progress.completed_content_count == 1


@pytest.mark.asyncio
async def test_reflex_catalog_excludes_draft_lessons(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await create_reflex_user(db_session, "reflex-catalog@example.com")
    published = await create_reflex_lesson(db_session, slug="published-reflex")
    draft = await create_reflex_lesson(db_session, slug="draft-reflex", status=ContentStatus.DRAFT)
    override_reflex_dependencies(user)

    response = await client.get("/api/v1/reflex/lessons")

    assert response.status_code == 200
    payload = response.json()
    ids = {item["id"] for item in payload["items"]}
    assert str(published.id) in ids
    assert str(draft.id) not in ids
    assert payload["items"][0]["is_completed"] is False


@pytest.mark.asyncio
async def test_evaluate_reflex_rejects_unsupported_audio(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await create_reflex_user(db_session, "reflex-invalid-audio@example.com")
    content = await create_reflex_lesson(db_session, slug="invalid-audio-reflex")
    override_reflex_dependencies(user)

    response = await client.post(
        f"/api/v1/reflex/lessons/{content.id}/evaluate",
        data={"response_start_ms": "3001"},
        files={"audio_file": ("answer.txt", b"not-audio", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_audio"


@pytest.mark.asyncio
async def test_reflex_accepts_browser_webm_audio(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await create_reflex_user(db_session, "reflex-webm@example.com")
    content = await create_reflex_lesson(db_session, slug="webm-reflex")
    override_reflex_dependencies(user)

    response = await client.post(
        f"/api/v1/reflex/lessons/{content.id}/evaluate",
        data={"response_start_ms": "1200"},
        files={"audio_file": ("answer.webm", b"webm-audio", "audio/webm")},
    )

    assert response.status_code == 200
    assert response.json()["response_start_ms"] == 1200


class TimeoutAiGateway(FakeAiGateway):
    async def transcribe(
        self,
        *,
        audio: bytes,
        filename: str,
        language: str,
        prompt_hint: str | None = None,
    ) -> TranscriptionResult:
        del audio, filename, language, prompt_hint
        raise AiTimeoutError()


@pytest.mark.asyncio
async def test_ai_timeout_does_not_persist_attempt_schedule_or_exp(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await create_reflex_user(db_session, "reflex-timeout@example.com")
    content = await create_reflex_lesson(db_session, slug="timeout-reflex")
    override_reflex_dependencies(user)
    app.dependency_overrides[get_ai_gateway] = TimeoutAiGateway

    response = await client.post(
        f"/api/v1/reflex/lessons/{content.id}/evaluate",
        data={"response_start_ms": "1000"},
        files={"audio_file": ("answer.mp3", b"ID3valid-audio", "audio/mpeg")},
    )

    assert response.status_code == 504
    assert response.json()["error"]["code"] == "ai_timeout"
    assert (
        await db_session.scalar(
            select(ExerciseAttempt).where(ExerciseAttempt.content_id == content.id)
        )
        is None
    )
    assert await db_session.get(ReviewSchedule, (user.id, content.id)) is None
    assert (
        await db_session.scalar(select(XpTransaction).where(XpTransaction.user_id == user.id))
        is None
    )


@pytest.mark.asyncio
async def test_completed_reflex_survives_refresh_and_appears_in_review_schedule(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await create_reflex_user(db_session, "reflex-refresh@example.com")
    content = await create_reflex_lesson(db_session, slug="refresh-reflex")
    override_reflex_dependencies(user)

    evaluation = await client.post(
        f"/api/v1/reflex/lessons/{content.id}/evaluate",
        data={"response_start_ms": "2500"},
        files={"audio_file": ("answer.mp3", b"ID3valid-audio", "audio/mpeg")},
    )
    catalog = await client.get("/api/v1/reflex/lessons")
    schedule = await client.get("/api/v1/review/schedule")

    assert evaluation.status_code == 200
    lesson = next(item for item in catalog.json()["items"] if item["id"] == str(content.id))
    assert lesson["is_completed"] is True
    assert schedule.status_code == 200
    assert schedule.json()["items"][0]["lesson_id"] == str(content.id)
    assert schedule.json()["items"][0]["review_count"] == 1


@pytest.mark.asyncio
async def test_due_reviews_include_all_schedules_due_today(
    client: httpx.AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = await create_reflex_user(db_session, "reflex-due-today@example.com")
    due_today = await create_reflex_lesson(db_session, slug="due-today-reflex")
    due_tomorrow = await create_reflex_lesson(db_session, slug="due-tomorrow-reflex")
    override_reflex_dependencies(user)
    current_time = datetime(2026, 8, 21, 9, tzinfo=UTC)
    monkeypatch.setattr("app.services.reflex.utc_now", lambda: current_time)
    db_session.add_all(
        [
            ReviewSchedule(
                user_id=user.id,
                content_id=due_today.id,
                due_at=datetime(2026, 8, 21, 23, 59, tzinfo=UTC),
                interval_days=1,
                ease_factor=2.5,
                repetitions=1,
            ),
            ReviewSchedule(
                user_id=user.id,
                content_id=due_tomorrow.id,
                due_at=datetime(2026, 8, 22, 0, tzinfo=UTC),
                interval_days=1,
                ease_factor=2.5,
                repetitions=1,
            ),
        ]
    )
    await db_session.flush()

    response = await client.get("/api/v1/review/due")

    assert response.status_code == 200
    payload = response.json()
    assert payload["due_count"] == 1
    assert payload["items"][0]["lesson_id"] == str(due_today.id)
