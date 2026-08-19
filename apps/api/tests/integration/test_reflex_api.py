import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.ai import get_ai_gateway
from app.api.dependencies.auth import get_current_user
from app.integrations.ai.providers.fake import FakeAiGateway
from app.main import app
from app.models.attempt import AiEvaluation, ExerciseAttempt, ReviewSchedule
from app.models.content import LearningContent, ReflexExercise
from app.models.enums import ContentStatus, ContentType, JlptLevel
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
        files={"audio_file": ("answer.webm", b"valid-audio", "audio/webm")},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["score"] == 100
    assert payload["is_on_time"] is True
    assert payload["review_interval_days"] == 7
    assert payload["earned_exp"] == 50

    attempt = await db_session.scalar(
        select(ExerciseAttempt).where(ExerciseAttempt.content_id == content.id)
    )
    assert attempt is not None
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
    ids = {item["id"] for item in response.json()}
    assert str(published.id) in ids
    assert str(draft.id) not in ids


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
