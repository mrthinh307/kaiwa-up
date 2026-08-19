"""Database access for AI Tutor scenarios, conversations, and messages."""

import uuid
from datetime import datetime
from typing import NamedTuple, cast

from sqlalchemy import func, select

from app.models.enums import JlptLevel, TutorSender
from app.models.tutor import TutorMessage, TutorSession
from app.repositories.base import BaseRepository


class TutorConversationHistoryRow(NamedTuple):
    """A conversation summary plus its latest message projection."""

    session: TutorSession
    last_message_text: str | None
    updated_at: datetime


class TutorRepository(BaseRepository):
    async def create_session(
        self,
        *,
        user_id: uuid.UUID,
        topic: str,
        difficulty: JlptLevel,
        scenario: str | None,
    ) -> TutorSession:
        tutor_session = TutorSession(
            user_id=user_id,
            topic=topic,
            difficulty=difficulty,
            scenario=scenario,
            status="active",
        )
        self.session.add(tutor_session)
        await self.session.flush()
        await self.session.refresh(tutor_session)
        return tutor_session

    async def list_sessions_for_user(
        self,
        *,
        user_id: uuid.UUID,
        limit: int,
        offset: int,
    ) -> tuple[list[TutorConversationHistoryRow], int]:
        total = (
            await self.session.scalar(
                select(func.count())
                .select_from(TutorSession)
                .where(TutorSession.user_id == user_id)
            )
            or 0
        )
        last_message_text = (
            select(TutorMessage.content)
            .where(TutorMessage.session_id == TutorSession.id)
            .order_by(TutorMessage.sequence_number.desc())
            .limit(1)
            .scalar_subquery()
        )
        last_message_at = (
            select(TutorMessage.created_at)
            .where(TutorMessage.session_id == TutorSession.id)
            .order_by(TutorMessage.sequence_number.desc())
            .limit(1)
            .scalar_subquery()
        )
        updated_at = func.coalesce(last_message_at, TutorSession.started_at).label("updated_at")
        statement = (
            select(TutorSession, last_message_text, updated_at)
            .where(TutorSession.user_id == user_id)
            .order_by(updated_at.desc(), TutorSession.id.desc())
            .limit(limit)
            .offset(offset)
        )
        rows = (await self.session.execute(statement)).all()
        return [
            TutorConversationHistoryRow(
                session=row[0],
                last_message_text=row[1],
                updated_at=row[2],
            )
            for row in rows
        ], total

    async def get_session(self, conversation_id: uuid.UUID) -> TutorSession | None:
        return cast(
            TutorSession | None,
            await self.session.scalar(
                select(TutorSession).where(TutorSession.id == conversation_id)
            ),
        )

    async def get_session_for_update(self, conversation_id: uuid.UUID) -> TutorSession | None:
        return cast(
            TutorSession | None,
            await self.session.scalar(
                select(TutorSession).where(TutorSession.id == conversation_id).with_for_update()
            ),
        )

    async def list_messages(self, session_id: uuid.UUID) -> list[TutorMessage]:
        statement = (
            select(TutorMessage)
            .where(TutorMessage.session_id == session_id)
            .order_by(TutorMessage.sequence_number.asc())
        )
        return list((await self.session.scalars(statement)).all())

    async def get_context_messages(
        self,
        session_id: uuid.UUID,
        *,
        limit: int,
    ) -> list[TutorMessage]:
        statement = (
            select(TutorMessage)
            .where(TutorMessage.session_id == session_id)
            .order_by(TutorMessage.sequence_number.desc())
            .limit(limit)
        )
        messages = list((await self.session.scalars(statement)).all())
        messages.reverse()
        return messages

    async def get_last_message(self, session_id: uuid.UUID) -> TutorMessage | None:
        statement = (
            select(TutorMessage)
            .where(TutorMessage.session_id == session_id)
            .order_by(TutorMessage.sequence_number.desc())
            .limit(1)
        )
        return cast(TutorMessage | None, await self.session.scalar(statement))

    async def get_message_by_sequence(
        self,
        *,
        session_id: uuid.UUID,
        sequence_number: int,
    ) -> TutorMessage | None:
        statement = select(TutorMessage).where(
            TutorMessage.session_id == session_id,
            TutorMessage.sequence_number == sequence_number,
        )
        return cast(TutorMessage | None, await self.session.scalar(statement))

    async def get_user_message_by_client_id(
        self,
        *,
        session_id: uuid.UUID,
        client_message_id: uuid.UUID,
    ) -> TutorMessage | None:
        statement = select(TutorMessage).where(
            TutorMessage.session_id == session_id,
            TutorMessage.sender == TutorSender.USER,
            TutorMessage.client_message_id == client_message_id,
        )
        return cast(TutorMessage | None, await self.session.scalar(statement))

    async def create_message(
        self,
        *,
        session_id: uuid.UUID,
        sender: TutorSender,
        sequence_number: int,
        content: str,
        client_message_id: uuid.UUID | None,
        feedback: dict[str, object] | None = None,
    ) -> TutorMessage:
        message = TutorMessage(
            session_id=session_id,
            sender=sender,
            sequence_number=sequence_number,
            content=content,
            client_message_id=client_message_id,
            feedback=feedback,
        )
        self.session.add(message)
        await self.session.flush()
        await self.session.refresh(message)
        return message

    async def complete_session(
        self,
        tutor_session: TutorSession,
        *,
        ended_at: datetime,
    ) -> TutorSession:
        tutor_session.status = "completed"
        tutor_session.ended_at = ended_at
        self.session.add(tutor_session)
        await self.session.flush()
        await self.session.refresh(tutor_session)
        return tutor_session
