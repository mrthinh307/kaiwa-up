from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gamification import XpTransaction
from app.models.user import User
from app.repositories.leaderboard import LeaderboardRepository
from app.services.leaderboard import LeaderboardService


async def create_user(session: AsyncSession, *, email: str, display_name: str) -> User:
    user = User(email=email, password_hash="password-hash", display_name=display_name)
    session.add(user)
    await session.flush()
    return user


async def create_xp(
    session: AsyncSession,
    *,
    user_id,
    amount: int,
    created_at: datetime,
) -> XpTransaction:
    transaction = XpTransaction(
        user_id=user_id,
        amount=amount,
        reason="practice",
        created_at=created_at,
    )
    session.add(transaction)
    await session.flush()
    return transaction


@pytest.mark.asyncio
async def test_rebuild_week_aggregates_exp_within_week(
    db_session: AsyncSession,
) -> None:
    user_a = await create_user(session=db_session, email="a@example.com", display_name="User A")
    user_b = await create_user(session=db_session, email="b@example.com", display_name="User B")
    service = LeaderboardService(LeaderboardRepository(db_session))

    monday = datetime(2026, 8, 10, tzinfo=UTC)
    within_week = datetime(2026, 8, 12, 12, 0, tzinfo=UTC)
    outside_week = datetime(2026, 8, 17, 0, 0, tzinfo=UTC)
    await create_xp(session=db_session, user_id=user_a.id, amount=100, created_at=within_week)
    await create_xp(session=db_session, user_id=user_a.id, amount=50, created_at=within_week)
    await create_xp(session=db_session, user_id=user_b.id, amount=200, created_at=within_week)
    await create_xp(session=db_session, user_id=user_b.id, amount=999, created_at=outside_week)

    count = await service.rebuild_week(week_start=monday.date())

    assert count == 2
    rows = await LeaderboardRepository(db_session).get_week_rankings(
        week_start=monday.date(), limit=10
    )
    assert [(row.rank, row.user_id, row.weekly_exp) for row in rows] == [
        (1, user_b.id, 200),
        (2, user_a.id, 150),
    ]


@pytest.mark.asyncio
async def test_rebuild_week_breaks_ties_by_user_id(
    db_session: AsyncSession,
) -> None:
    user_a = await create_user(session=db_session, email="a@example.com", display_name="User A")
    user_b = await create_user(session=db_session, email="b@example.com", display_name="User B")
    service = LeaderboardService(LeaderboardRepository(db_session))
    monday = datetime(2026, 8, 10, 12, 0, tzinfo=UTC)
    await create_xp(session=db_session, user_id=user_a.id, amount=150, created_at=monday)
    await create_xp(session=db_session, user_id=user_b.id, amount=150, created_at=monday)

    await service.rebuild_week(week_start=monday.date())

    rows = await LeaderboardRepository(db_session).get_week_rankings(
        week_start=monday.date(), limit=10
    )
    assert rows[0].user_id == min(user_a.id, user_b.id)
    assert rows[0].weekly_exp == 150
    assert rows[1].weekly_exp == 150


@pytest.mark.asyncio
async def test_rebuild_week_is_idempotent(db_session: AsyncSession) -> None:
    user_a = await create_user(session=db_session, email="a@example.com", display_name="User A")
    service = LeaderboardService(LeaderboardRepository(db_session))
    monday = datetime(2026, 8, 10, 12, 0, tzinfo=UTC)
    await create_xp(session=db_session, user_id=user_a.id, amount=100, created_at=monday)

    await service.rebuild_week(week_start=monday.date())
    await service.rebuild_week(week_start=monday.date())

    rows = await LeaderboardRepository(db_session).get_week_rankings(
        week_start=monday.date(), limit=10
    )
    assert len(rows) == 1
    assert rows[0].rank == 1
    assert rows[0].weekly_exp == 100
