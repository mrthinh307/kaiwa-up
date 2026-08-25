from collections.abc import Callable
from datetime import UTC, datetime

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.main import app
from app.models.attempt import ExerciseAttempt
from app.models.content import LearningContent
from app.models.enums import AttemptStatus, ContentStatus, ContentType, JlptLevel
from app.models.user import User
from app.repositories.gamification import GamificationRepository
from app.services.gamification import GamificationService

PROFILE_PATH = "/api/v1/gamification/profile"


async def create_user(session: AsyncSession, *, email: str, display_name: str) -> User:
    user = User(email=email, password_hash="password-hash", display_name=display_name)
    session.add(user)
    await session.flush()
    return user


async def create_content(
    session: AsyncSession,
    *,
    content_type: ContentType,
    slug: str,
    title: str,
    base_exp: int,
) -> LearningContent:
    content = LearningContent(
        content_type=content_type,
        status=ContentStatus.PUBLISHED,
        slug=slug,
        title=title,
        difficulty=JlptLevel.N5,
        base_exp=base_exp,
    )
    session.add(content)
    await session.flush()
    return content


async def create_attempt(
    session: AsyncSession,
    *,
    user_id,
    content_id,
    completed_at: datetime,
) -> ExerciseAttempt:
    attempt = ExerciseAttempt(
        user_id=user_id,
        content_id=content_id,
        attempt_number=1,
        status=AttemptStatus.COMPLETED,
        completed_at=completed_at,
        started_at=completed_at,
    )
    session.add(attempt)
    await session.flush()
    return attempt


def set_current_user(user: User) -> None:
    async def _current_user() -> User:
        return user

    app.dependency_overrides[get_current_user] = _current_user


@pytest.mark.asyncio
async def test_gamification_profile_returns_default_profile(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_value: Callable[[str], str],
) -> None:
    user = await create_user(
        session=db_session, email=f"{unique_value('user-a')}@example.com", display_name="User A"
    )
    set_current_user(user)

    response = await client.get(PROFILE_PATH)

    assert response.status_code == 200
    assert response.json() == {
        "level": 1,
        "level_title": "Level 1",
        "total_exp": 0,
        "current_level_min_exp": 0,
        "next_level_min_exp": 50,
        "exp_to_next_level": 50,
        "recent_exp_history": [],
    }


@pytest.mark.asyncio
async def test_gamification_profile_returns_history_with_attempt_id(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_value: Callable[[str], str],
) -> None:
    user = await create_user(
        session=db_session, email=f"{unique_value('user-a')}@example.com", display_name="User A"
    )
    content = await create_content(
        session=db_session,
        content_type=ContentType.SHADOWING_DICTATION,
        slug=unique_value("dictation"),
        title="Thời tiết hôm nay",
        base_exp=50,
    )
    completed_at = datetime(2026, 8, 10, 8, 10, tzinfo=UTC)
    attempt = await create_attempt(
        session=db_session,
        user_id=user.id,
        content_id=content.id,
        completed_at=completed_at,
    )
    service = GamificationService(GamificationRepository(db_session))
    await service.award_experience(user_id=user.id, attempt_id=attempt.id)
    set_current_user(user)

    response = await client.get(PROFILE_PATH)

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_exp"] == 50
    assert payload["level"] == 2
    assert payload["current_level_min_exp"] == 50
    assert payload["next_level_min_exp"] == 150
    assert payload["exp_to_next_level"] == 100
    assert len(payload["recent_exp_history"]) == 1
    history_item = payload["recent_exp_history"][0]
    assert history_item["attempt_id"] == str(attempt.id)
    assert history_item["amount"] == 50
    assert history_item["reason"] == "Hoàn thành Shadowing Dictation: Thời tiết hôm nay"
    created_at = datetime.fromisoformat(history_item["created_at"].replace("Z", "+00:00"))
    assert created_at.tzinfo is not None


@pytest.mark.asyncio
async def test_gamification_profile_honors_limit_query_param(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_value: Callable[[str], str],
) -> None:
    user = await create_user(
        session=db_session, email=f"{unique_value('user-a')}@example.com", display_name="User A"
    )
    service = GamificationService(GamificationRepository(db_session))
    for index in range(5):
        content = await create_content(
            session=db_session,
            content_type=ContentType.SHADOWING_DICTATION,
            slug=unique_value(f"content-{index}"),
            title=f"Bài {index}",
            base_exp=10,
        )
        attempt = await create_attempt(
            session=db_session,
            user_id=user.id,
            content_id=content.id,
            completed_at=datetime(2026, 8, 10, 8, 10 + index, tzinfo=UTC),
        )
        await service.award_experience(user_id=user.id, attempt_id=attempt.id)
    set_current_user(user)

    response = await client.get(PROFILE_PATH, params={"limit": 3})

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["recent_exp_history"]) == 3
    assert payload["total_exp"] == 50


@pytest.mark.asyncio
async def test_gamification_profile_rejects_unauthenticated_requests(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_value: Callable[[str], str],
) -> None:
    del db_session, unique_value

    response = await client.get(PROFILE_PATH)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"
