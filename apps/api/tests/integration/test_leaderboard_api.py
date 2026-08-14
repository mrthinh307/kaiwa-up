from datetime import UTC, datetime
from uuid import UUID

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.main import app
from app.models.gamification import XpTransaction
from app.models.user import User
from app.repositories.leaderboard import LeaderboardRepository
from app.services.leaderboard import LeaderboardService
from app.utils.datetime_utils import week_start_for

LEADERBOARD_PATH = "/api/v1/leaderboard/weekly"


async def create_user(session: AsyncSession, *, email: str, display_name: str) -> User:
    user = User(email=email, password_hash="password-hash", display_name=display_name)
    session.add(user)
    await session.flush()
    return user


async def create_xp(
    session: AsyncSession,
    *,
    user_id: UUID,
    amount: int,
    created_at: datetime | None = None,
) -> XpTransaction:
    transaction = XpTransaction(
        user_id=user_id,
        amount=amount,
        reason="practice",
        created_at=created_at or datetime.now(UTC),
    )
    session.add(transaction)
    await session.flush()
    return transaction


def set_current_user(user: User) -> None:
    async def _current_user() -> User:
        return user

    app.dependency_overrides[get_current_user] = _current_user


def cleanup_overrides() -> None:
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_weekly_leaderboard_requires_auth(client: httpx.AsyncClient) -> None:
    response = await client.get(LEADERBOARD_PATH)

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_weekly_leaderboard_returns_rankings_and_user_rank(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    current_user = await create_user(session=db_session, email="me@example.com", display_name="Me")
    top_user = await create_user(session=db_session, email="top@example.com", display_name="Top")
    await create_xp(session=db_session, user_id=current_user.id, amount=100)
    await create_xp(session=db_session, user_id=top_user.id, amount=250)

    service = LeaderboardService(LeaderboardRepository(db_session))
    week_start = week_start_for(datetime.now(UTC).date())
    await service.rebuild_week(week_start=week_start)

    set_current_user(current_user)
    try:
        response = await client.get(LEADERBOARD_PATH)
    finally:
        cleanup_overrides()

    assert response.status_code == 200
    body = response.json()
    assert body["week_start"] == week_start.isoformat()
    assert body["user_rank"]["rank"] == 2
    assert body["user_rank"]["user_id"] == str(current_user.id)
    assert [entry["rank"] for entry in body["rankings"]] == [1, 2]
    assert body["rankings"][0] == {
        "rank": 1,
        "user_id": str(top_user.id),
        "display_name": "Top",
        "avatar_url": None,
        "weekly_exp": 250,
    }


@pytest.mark.asyncio
async def test_weekly_leaderboard_returns_null_user_rank_without_exp(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    current_user = await create_user(session=db_session, email="me@example.com", display_name="Me")
    other_user = await create_user(
        session=db_session, email="other@example.com", display_name="Other"
    )
    await create_xp(session=db_session, user_id=other_user.id, amount=100)

    service = LeaderboardService(LeaderboardRepository(db_session))
    week_start = week_start_for(datetime.now(UTC).date())
    await service.rebuild_week(week_start=week_start)

    set_current_user(current_user)
    try:
        response = await client.get(LEADERBOARD_PATH)
    finally:
        cleanup_overrides()

    assert response.status_code == 200
    body = response.json()
    assert body["user_rank"] is None
    assert [entry["user_id"] for entry in body["rankings"]] == [str(other_user.id)]


@pytest.mark.asyncio
async def test_weekly_leaderboard_empty_when_no_snapshot(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    current_user = await create_user(session=db_session, email="me@example.com", display_name="Me")
    await create_xp(session=db_session, user_id=current_user.id, amount=100)

    set_current_user(current_user)
    try:
        response = await client.get(LEADERBOARD_PATH)
    finally:
        cleanup_overrides()

    assert response.status_code == 200
    body = response.json()
    assert body["rankings"] == []
    assert body["user_rank"] is None


@pytest.mark.asyncio
async def test_weekly_leaderboard_limit_is_applied(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    current_user = await create_user(session=db_session, email="me@example.com", display_name="Me")
    for index in range(3):
        other = await create_user(
            session=db_session,
            email=f"other{index}@example.com",
            display_name=f"Other {index}",
        )
        await create_xp(session=db_session, user_id=other.id, amount=100 + index)

    service = LeaderboardService(LeaderboardRepository(db_session))
    week_start = week_start_for(datetime.now(UTC).date())
    await service.rebuild_week(week_start=week_start)

    set_current_user(current_user)
    try:
        response = await client.get(LEADERBOARD_PATH, params={"limit": 2})
    finally:
        cleanup_overrides()

    assert response.status_code == 200
    body = response.json()
    assert len(body["rankings"]) == 2
    assert body["user_rank"] is None


@pytest.mark.asyncio
async def test_weekly_leaderboard_rejects_invalid_limit(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    current_user = await create_user(session=db_session, email="me@example.com", display_name="Me")

    set_current_user(current_user)
    try:
        response = await client.get(LEADERBOARD_PATH, params={"limit": 0})
    finally:
        cleanup_overrides()

    assert response.status_code == 422
