import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.gamification import AttemptForbiddenError, AttemptNotFoundError
from app.models.attempt import ExerciseAttempt
from app.models.content import LearningContent
from app.models.enums import AttemptStatus, ContentStatus, ContentType, JlptLevel
from app.models.gamification import XpTransaction
from app.models.user import User
from app.repositories.gamification import GamificationRepository
from app.services.gamification import GamificationService


async def create_user(session: AsyncSession, *, email: str, display_name: str = "User A") -> User:
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
    user_id: uuid.UUID,
    content_id: uuid.UUID,
    status: AttemptStatus = AttemptStatus.COMPLETED,
) -> ExerciseAttempt:
    attempt = ExerciseAttempt(
        user_id=user_id,
        content_id=content_id,
        attempt_number=1,
        status=status,
        started_at=datetime.now(UTC),
    )
    session.add(attempt)
    await session.flush()
    return attempt


def make_service(session: AsyncSession) -> GamificationService:
    return GamificationService(GamificationRepository(session))


async def count_transactions(session: AsyncSession, attempt_id: uuid.UUID) -> int:
    return (
        await session.scalar(
            select(func.count())
            .select_from(XpTransaction)
            .where(XpTransaction.attempt_id == attempt_id)
        )
        or 0
    )


@pytest.mark.asyncio
async def test_award_grants_base_exp_and_updates_total(
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com")
    content = await create_content(
        session=db_session,
        content_type=ContentType.SHADOWING_DICTATION,
        slug="dictation",
        title="Thời tiết hôm nay",
        base_exp=50,
    )
    attempt = await create_attempt(session=db_session, user_id=user.id, content_id=content.id)

    result = await make_service(db_session).award_experience(
        user_id=user.id,
        attempt_id=attempt.id,
    )

    assert result.awarded is True
    assert result.amount == 50
    assert result.total_exp == 50
    assert result.level == 2

    transaction = await db_session.scalar(
        select(XpTransaction).where(XpTransaction.attempt_id == attempt.id)
    )
    assert transaction is not None
    assert transaction.user_id == user.id
    assert transaction.amount == 50
    assert transaction.reason == "Hoàn thành Shadowing Dictation: Thời tiết hôm nay"


@pytest.mark.asyncio
async def test_award_is_idempotent_for_same_attempt(
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com")
    content = await create_content(
        session=db_session,
        content_type=ContentType.SHADOWING_DICTATION,
        slug="shadowing",
        title="Chào hỏi công sở",
        base_exp=50,
    )
    attempt = await create_attempt(session=db_session, user_id=user.id, content_id=content.id)
    service = make_service(db_session)

    first = await service.award_experience(user_id=user.id, attempt_id=attempt.id)
    second = await service.award_experience(user_id=user.id, attempt_id=attempt.id)

    assert first.awarded is True
    assert second.awarded is False
    assert second.amount == 0
    assert second.total_exp == 50
    assert await count_transactions(db_session, attempt.id) == 1


@pytest.mark.asyncio
async def test_award_does_not_grant_for_incomplete_attempt(
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com")
    content = await create_content(
        session=db_session,
        content_type=ContentType.REFLEX,
        slug="reflex",
        title="Điểm hẹn",
        base_exp=50,
    )
    attempt = await create_attempt(
        session=db_session,
        user_id=user.id,
        content_id=content.id,
        status=AttemptStatus.IN_PROGRESS,
    )

    result = await make_service(db_session).award_experience(
        user_id=user.id,
        attempt_id=attempt.id,
    )

    assert result.awarded is False
    assert result.amount == 0
    assert result.total_exp == 0
    assert await count_transactions(db_session, attempt.id) == 0


@pytest.mark.asyncio
async def test_award_raises_forbidden_for_other_user(
    db_session: AsyncSession,
) -> None:
    owner = await create_user(session=db_session, email="a@example.com")
    requester = await create_user(session=db_session, email="b@example.com")
    content = await create_content(
        session=db_session,
        content_type=ContentType.SHADOWING_DICTATION,
        slug="dictation",
        title="Thời tiết hôm nay",
        base_exp=50,
    )
    attempt = await create_attempt(session=db_session, user_id=owner.id, content_id=content.id)

    with pytest.raises(AttemptForbiddenError):
        await make_service(db_session).award_experience(
            user_id=requester.id,
            attempt_id=attempt.id,
        )


@pytest.mark.asyncio
async def test_award_raises_not_found_for_unknown_attempt(
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com")

    with pytest.raises(AttemptNotFoundError):
        await make_service(db_session).award_experience(
            user_id=user.id,
            attempt_id=uuid.uuid4(),
        )


@pytest.mark.asyncio
async def test_award_increases_level_at_threshold(
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com")
    content_a = await create_content(
        session=db_session,
        content_type=ContentType.SHADOWING_DICTATION,
        slug="a",
        title="Bài A",
        base_exp=100,
    )
    content_b = await create_content(
        session=db_session,
        content_type=ContentType.SHADOWING_DICTATION,
        slug="b",
        title="Bài B",
        base_exp=150,
    )
    attempt_a = await create_attempt(session=db_session, user_id=user.id, content_id=content_a.id)
    attempt_b = await create_attempt(session=db_session, user_id=user.id, content_id=content_b.id)
    service = make_service(db_session)

    first = await service.award_experience(user_id=user.id, attempt_id=attempt_a.id)
    second = await service.award_experience(user_id=user.id, attempt_id=attempt_b.id)

    assert first.total_exp == 100
    assert first.level == 2
    assert second.total_exp == 250
    assert second.level == 3


@pytest.mark.asyncio
async def test_profile_returns_contract_fields_with_history(
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com")
    content_a = await create_content(
        session=db_session,
        content_type=ContentType.SHADOWING_DICTATION,
        slug="a",
        title="Thời tiết hôm nay",
        base_exp=100,
    )
    content_b = await create_content(
        session=db_session,
        content_type=ContentType.SHADOWING_DICTATION,
        slug="b",
        title="Chào hỏi",
        base_exp=50,
    )
    attempt_a = await create_attempt(session=db_session, user_id=user.id, content_id=content_a.id)
    attempt_b = await create_attempt(session=db_session, user_id=user.id, content_id=content_b.id)
    service = make_service(db_session)
    await service.award_experience(user_id=user.id, attempt_id=attempt_a.id)
    await service.award_experience(user_id=user.id, attempt_id=attempt_b.id)

    profile = await service.get_profile(user.id, recent_limit=20)

    assert profile.level == 3
    assert profile.level_title == "Level 3"
    assert profile.total_exp == 150
    assert profile.current_level_min_exp == 150
    assert profile.next_level_min_exp == 300
    assert profile.exp_to_next_level == 150
    assert [item.amount for item in profile.recent_exp_history] == [50, 100]
    assert profile.recent_exp_history[0].attempt_id == attempt_b.id
    assert profile.recent_exp_history[0].reason == "Hoàn thành Shadowing Dictation: Chào hỏi"


@pytest.mark.asyncio
async def test_profile_recent_history_respects_limit(
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com")
    for index in range(25):
        transaction = XpTransaction(
            user_id=user.id,
            attempt_id=None,
            amount=10,
            reason=f"Transaction {index}",
            created_at=datetime(2026, 8, 1, tzinfo=UTC) + timedelta(hours=index),
        )
        db_session.add(transaction)
    await db_session.flush()

    profile = await make_service(db_session).get_profile(user.id, recent_limit=10)

    assert len(profile.recent_exp_history) == 10
    assert profile.total_exp == 0
