import uuid
from collections.abc import Callable
from datetime import UTC

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import JlptLevel, TutorSender
from app.models.user import User
from app.repositories.tutor import TutorRepository


async def create_user(
    session: AsyncSession,
    *,
    email: str,
) -> User:
    user = User(email=email, password_hash="password-hash", display_name="Tutor User")
    session.add(user)
    await session.flush()
    return user


@pytest.mark.asyncio
async def test_repository_persists_ordered_messages_and_context(
    db_session: AsyncSession,
    unique_email: Callable[[str], str],
) -> None:
    user = await create_user(db_session, email=unique_email("tutor"))
    repository = TutorRepository(db_session)
    tutor_session = await repository.create_session(
        user_id=user.id,
        topic="Du lịch",
        difficulty=JlptLevel.N3,
        scenario=None,
    )
    client_message_id = uuid.uuid4()

    first = await repository.create_message(
        session_id=tutor_session.id,
        sender=TutorSender.AI,
        sequence_number=1,
        content="どこに行きたいですか？",
        client_message_id=None,
    )
    user_message = await repository.create_message(
        session_id=tutor_session.id,
        sender=TutorSender.USER,
        sequence_number=2,
        content="京都に行きたいです。",
        client_message_id=client_message_id,
    )
    last = await repository.create_message(
        session_id=tutor_session.id,
        sender=TutorSender.AI,
        sequence_number=3,
        content="いいですね！",
        client_message_id=None,
    )

    messages = await repository.list_messages(tutor_session.id)
    context = await repository.get_context_messages(tutor_session.id, limit=2)
    found_by_client_id = await repository.get_user_message_by_client_id(
        session_id=tutor_session.id,
        client_message_id=client_message_id,
    )

    assert [message.id for message in messages] == [first.id, user_message.id, last.id]
    assert [message.sequence_number for message in context] == [2, 3]
    assert found_by_client_id is not None
    assert found_by_client_id.id == user_message.id
    assert (await repository.get_last_message(tutor_session.id)).id == last.id
    assert (
        await repository.get_message_by_sequence(
            session_id=tutor_session.id,
            sequence_number=2,
        )
    ).id == user_message.id


@pytest.mark.asyncio
async def test_list_sessions_is_scoped_and_returns_last_message_projection(
    db_session: AsyncSession,
    unique_email: Callable[[str], str],
) -> None:
    user_a = await create_user(db_session, email=unique_email("user-a"))
    user_b = await create_user(db_session, email=unique_email("user-b"))
    repository = TutorRepository(db_session)

    session_a = await repository.create_session(
        user_id=user_a.id,
        topic="A",
        difficulty=JlptLevel.N5,
        scenario=None,
    )
    session_b = await repository.create_session(
        user_id=user_b.id,
        topic="B",
        difficulty=JlptLevel.N5,
        scenario=None,
    )
    await repository.create_message(
        session_id=session_a.id,
        sender=TutorSender.AI,
        sequence_number=1,
        content="Latest for A",
        client_message_id=None,
    )
    await repository.create_message(
        session_id=session_b.id,
        sender=TutorSender.AI,
        sequence_number=1,
        content="Only for B",
        client_message_id=None,
    )

    rows, total = await repository.list_sessions_for_user(
        user_id=user_a.id,
        limit=20,
        offset=0,
    )

    assert total == 1
    assert len(rows) == 1
    assert rows[0].session.id == session_a.id
    assert rows[0].last_message_text == "Latest for A"
    assert rows[0].updated_at.tzinfo == UTC
