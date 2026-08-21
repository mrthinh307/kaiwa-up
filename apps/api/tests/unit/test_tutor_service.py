import uuid
from datetime import UTC, datetime
from typing import TypedDict
from unittest.mock import AsyncMock

import pytest

from app.exceptions.ai import AiTimeoutError
from app.exceptions.tutor import (
    TutorAiUnavailableError,
    TutorConversationCompletedError,
    TutorMessageIdempotencyConflictError,
    TutorResponsePendingError,
)
from app.integrations.ai import FakeAiGateway, TutorReply
from app.integrations.ai.base import TutorMessage as GatewayTutorMessage
from app.models.enums import JlptLevel, TutorExplanationLanguage, TutorSender
from app.models.tutor import TutorMessage, TutorSession
from app.repositories.tutor import TutorRepository
from app.schemas.tutor import (
    TutorConversationCreateRequest,
    TutorMessageCreateRequest,
)
from app.services.tutor import TutorService

NOW = datetime(2026, 8, 19, 10, 0, tzinfo=UTC)


class TutorGatewayCall(TypedDict):
    messages: list[GatewayTutorMessage]
    topic: str
    difficulty: str
    scenario: str | None
    explanation_language: str


class RecordingTutorGateway(FakeAiGateway):
    def __init__(self) -> None:
        self.calls: list[TutorGatewayCall] = []

    async def generate_tutor_reply(
        self,
        *,
        messages: list[GatewayTutorMessage],
        topic: str,
        difficulty: str,
        scenario: str | None = None,
        explanation_language: str = "vi",
    ) -> TutorReply:
        self.calls.append(
            {
                "messages": messages,
                "topic": topic,
                "difficulty": difficulty,
                "scenario": scenario,
                "explanation_language": explanation_language,
            }
        )
        return await super().generate_tutor_reply(
            messages=messages,
            topic=topic,
            difficulty=difficulty,
            scenario=scenario,
            explanation_language=explanation_language,
        )


class TimeoutTutorGateway(FakeAiGateway):
    async def generate_tutor_reply(
        self,
        *,
        messages: list[GatewayTutorMessage],
        topic: str,
        difficulty: str,
        scenario: str | None = None,
        explanation_language: str = "vi",
    ) -> TutorReply:
        raise AiTimeoutError("timeout")


def make_repository() -> AsyncMock:
    repository = AsyncMock(spec=TutorRepository)
    repository.session = AsyncMock()
    return repository


def make_session(*, user_id: uuid.UUID, status: str = "active") -> TutorSession:
    return TutorSession(
        id=uuid.uuid4(),
        user_id=user_id,
        topic="Du lịch",
        difficulty=JlptLevel.N3,
        scenario="Hỏi bạn về kế hoạch đi Kyoto.",
        status=status,
        started_at=NOW,
    )


def make_message(
    *,
    session_id: uuid.UUID,
    sender: TutorSender,
    sequence_number: int,
    content: str,
    text_meaning: dict[str, str] | None = None,
    client_message_id: uuid.UUID | None = None,
    feedback: dict[str, object] | None = None,
) -> TutorMessage:
    return TutorMessage(
        id=uuid.uuid4(),
        session_id=session_id,
        sender=sender,
        sequence_number=sequence_number,
        content=content,
        text_meaning=text_meaning,
        client_message_id=client_message_id,
        created_at=NOW,
        feedback=feedback,
    )


def ai_feedback() -> dict[str, object]:
    return {
        "explanation_language": "vi",
        "grammar_correction": None,
        "natural_expression_tip": (
            "Cách diễn đạt tự nhiên hơn để hỏi người học muốn luyện gì tiếp theo."
        ),
        "answer_hints": [
            {
                "text": "旅行について話したいです。",
                "text_meaning": {
                    "language": "vi",
                    "text": "Tôi muốn nói về du lịch.",
                },
            }
        ],
    }


@pytest.mark.asyncio
async def test_create_conversation_uses_user_context_and_persists_opening_message() -> None:
    user_id = uuid.uuid4()
    topic = "Du lịch"
    scenario = "Hỏi bạn về kế hoạch đi Kyoto."
    tutor_session = make_session(user_id=user_id)
    opening = make_message(
        session_id=tutor_session.id,
        sender=TutorSender.AI,
        sequence_number=1,
        content="こんにちは！",
        text_meaning={"language": "vi", "text": "Xin chào!"},
        feedback=ai_feedback(),
    )
    repository = make_repository()
    repository.create_session.return_value = tutor_session
    repository.create_message.return_value = opening
    gateway = RecordingTutorGateway()

    response = await TutorService(repository, gateway).create_conversation(
        user_id=user_id,
        data=TutorConversationCreateRequest(
            topic=topic,
            difficulty=JlptLevel.N3,
            scenario=scenario,
        ),
    )

    assert response.conversation_id == tutor_session.id
    assert response.initial_message.feedback is not None
    assert response.initial_message.feedback.answer_hints[0].text_meaning.text == (
        "Tôi muốn nói về du lịch."
    )
    assert response.initial_message.text_meaning is not None
    assert response.initial_message.text_meaning.text == "Xin chào!"
    assert gateway.calls[0]["scenario"] == scenario
    assert gateway.calls[0]["explanation_language"] == "vi"
    repository.create_session.assert_awaited_once_with(
        user_id=user_id,
        topic=topic,
        difficulty=JlptLevel.N3,
        scenario=scenario,
        explanation_language=TutorExplanationLanguage.VI,
    )
    repository.session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_send_message_commits_user_before_gateway_and_maps_ai_feedback() -> None:
    user_id = uuid.uuid4()
    tutor_session = make_session(user_id=user_id)
    client_message_id = uuid.uuid4()
    opening = make_message(
        session_id=tutor_session.id,
        sender=TutorSender.AI,
        sequence_number=1,
        content="どこに行きたいですか？",
    )
    user_message = make_message(
        session_id=tutor_session.id,
        sender=TutorSender.USER,
        sequence_number=2,
        content="京都に行きたいです。",
        client_message_id=client_message_id,
    )
    ai_message = make_message(
        session_id=tutor_session.id,
        sender=TutorSender.AI,
        sequence_number=3,
        content="いいですね！",
        text_meaning={"language": "vi", "text": "Tốt lắm!"},
        feedback=ai_feedback(),
    )
    repository = make_repository()
    repository.get_session_for_update.return_value = tutor_session
    repository.get_user_message_by_client_id.return_value = None
    repository.get_last_message.return_value = opening
    repository.create_message.side_effect = [user_message, ai_message]
    repository.get_context_messages.return_value = [opening, user_message]
    repository.get_message_by_sequence.return_value = None
    gateway = RecordingTutorGateway()

    response = await TutorService(repository, gateway).send_message(
        user_id=user_id,
        conversation_id=tutor_session.id,
        data=TutorMessageCreateRequest(
            text="京都に行きたいです。",
            client_message_id=client_message_id,
        ),
    )

    assert response.user_message.id == user_message.id
    assert response.ai_reply.id == ai_message.id
    assert response.ai_reply.feedback is not None
    assert response.ai_reply.feedback.natural_expression_tip == (
        "Cách diễn đạt tự nhiên hơn để hỏi người học muốn luyện gì tiếp theo."
    )
    assert response.ai_reply.text_meaning is not None
    assert response.ai_reply.text_meaning.text == "Tốt lắm!"
    assert gateway.calls[0]["messages"][0].role == "assistant"
    assert gateway.calls[0]["messages"][1].role == "user"
    assert repository.session.commit.await_count == 3


@pytest.mark.asyncio
async def test_send_message_reuses_cached_reply_for_idempotent_retry() -> None:
    user_id = uuid.uuid4()
    tutor_session = make_session(user_id=user_id)
    client_message_id = uuid.uuid4()
    user_message = make_message(
        session_id=tutor_session.id,
        sender=TutorSender.USER,
        sequence_number=2,
        content="京都に行きたいです。",
        client_message_id=client_message_id,
    )
    cached_reply = make_message(
        session_id=tutor_session.id,
        sender=TutorSender.AI,
        sequence_number=3,
        content="いいですね！",
        feedback=ai_feedback(),
    )
    repository = make_repository()
    repository.get_session_for_update.return_value = tutor_session
    repository.get_user_message_by_client_id.return_value = user_message
    repository.get_message_by_sequence.return_value = cached_reply
    gateway = RecordingTutorGateway()

    response = await TutorService(repository, gateway).send_message(
        user_id=user_id,
        conversation_id=tutor_session.id,
        data=TutorMessageCreateRequest(
            text=user_message.content,
            client_message_id=client_message_id,
        ),
    )

    assert response.user_message.id == user_message.id
    assert response.ai_reply.id == cached_reply.id
    assert gateway.calls == []
    repository.create_message.assert_not_awaited()


@pytest.mark.asyncio
async def test_send_message_rejects_same_client_id_with_different_text() -> None:
    user_id = uuid.uuid4()
    tutor_session = make_session(user_id=user_id)
    existing = make_message(
        session_id=tutor_session.id,
        sender=TutorSender.USER,
        sequence_number=2,
        content="京都に行きたいです。",
        client_message_id=uuid.uuid4(),
    )
    repository = make_repository()
    repository.get_session_for_update.return_value = tutor_session
    repository.get_user_message_by_client_id.return_value = existing

    with pytest.raises(TutorMessageIdempotencyConflictError):
        await TutorService(repository, RecordingTutorGateway()).send_message(
            user_id=user_id,
            conversation_id=tutor_session.id,
            data=TutorMessageCreateRequest(
                text="大阪に行きたいです。",
                client_message_id=existing.client_message_id,
            ),
        )


@pytest.mark.asyncio
async def test_send_message_preserves_user_message_when_gateway_times_out() -> None:
    user_id = uuid.uuid4()
    tutor_session = make_session(user_id=user_id)
    opening = make_message(
        session_id=tutor_session.id,
        sender=TutorSender.AI,
        sequence_number=1,
        content="どこに行きたいですか？",
    )
    user_message = make_message(
        session_id=tutor_session.id,
        sender=TutorSender.USER,
        sequence_number=2,
        content="京都に行きたいです。",
        client_message_id=uuid.uuid4(),
    )
    repository = make_repository()
    repository.get_session_for_update.return_value = tutor_session
    repository.get_user_message_by_client_id.return_value = None
    repository.get_last_message.return_value = opening
    repository.create_message.return_value = user_message

    with pytest.raises(TutorAiUnavailableError):
        await TutorService(repository, TimeoutTutorGateway()).send_message(
            user_id=user_id,
            conversation_id=tutor_session.id,
            data=TutorMessageCreateRequest(
                text=user_message.content,
                client_message_id=user_message.client_message_id,
            ),
        )

    assert repository.session.commit.await_count == 2
    repository.create_message.assert_awaited_once()


@pytest.mark.asyncio
async def test_send_message_rejects_new_turn_while_previous_response_is_pending() -> None:
    user_id = uuid.uuid4()
    tutor_session = make_session(user_id=user_id)
    pending_message = make_message(
        session_id=tutor_session.id,
        sender=TutorSender.USER,
        sequence_number=2,
        content="京都に行きたいです。",
        client_message_id=uuid.uuid4(),
    )
    repository = make_repository()
    repository.get_session_for_update.return_value = tutor_session
    repository.get_user_message_by_client_id.return_value = None
    repository.get_last_message.return_value = pending_message

    with pytest.raises(TutorResponsePendingError):
        await TutorService(repository, RecordingTutorGateway()).send_message(
            user_id=user_id,
            conversation_id=tutor_session.id,
            data=TutorMessageCreateRequest(
                text="大阪に行きたいです。",
                client_message_id=uuid.uuid4(),
            ),
        )


@pytest.mark.asyncio
async def test_delete_conversation_deletes_owned_session() -> None:
    user_id = uuid.uuid4()
    tutor_session = make_session(user_id=user_id)
    repository = make_repository()
    repository.get_session_for_update.return_value = tutor_session

    await TutorService(repository, RecordingTutorGateway()).delete_conversation(
        user_id=user_id,
        conversation_id=tutor_session.id,
    )

    repository.delete_session.assert_awaited_once_with(tutor_session)
    repository.session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_send_message_rejects_completed_conversation() -> None:
    user_id = uuid.uuid4()
    tutor_session = make_session(user_id=user_id, status="completed")
    repository = make_repository()
    repository.get_session_for_update.return_value = tutor_session

    with pytest.raises(TutorConversationCompletedError):
        await TutorService(repository, RecordingTutorGateway()).send_message(
            user_id=user_id,
            conversation_id=tutor_session.id,
            data=TutorMessageCreateRequest(
                text="こんにちは",
                client_message_id=uuid.uuid4(),
            ),
        )
