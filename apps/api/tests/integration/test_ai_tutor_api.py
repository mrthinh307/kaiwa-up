import uuid
from collections.abc import Callable

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.ai import get_ai_gateway
from app.api.dependencies.auth import get_current_user
from app.exceptions.ai import AiTimeoutError
from app.integrations.ai import FakeAiGateway, TutorReply
from app.integrations.ai.base import TutorMessage as GatewayTutorMessage
from app.main import app
from app.models.tutor import TutorMessage
from app.models.user import User

CONVERSATIONS_PATH = "/api/v1/ai-tutor/conversations"


async def create_user(
    session: AsyncSession,
    *,
    email: str,
    display_name: str,
) -> User:
    user = User(email=email, password_hash="password-hash", display_name=display_name)
    session.add(user)
    await session.flush()
    return user


def set_current_user(user: User) -> None:
    async def _current_user() -> User:
        return user

    app.dependency_overrides[get_current_user] = _current_user


def set_gateway(gateway: FakeAiGateway) -> None:
    app.dependency_overrides[get_ai_gateway] = lambda: gateway


class TimeoutGateway(FakeAiGateway):
    async def generate_tutor_reply(
        self,
        *,
        messages: list[GatewayTutorMessage],
        topic: str,
        difficulty: str,
        scenario: str | None = None,
        explanation_language: str = "vi",
    ) -> TutorReply:
        raise AiTimeoutError("Tutor provider timed out")


@pytest.mark.asyncio
async def test_ai_tutor_end_to_end_flow_and_idempotent_retry(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_email: Callable[[str], str],
) -> None:
    user = await create_user(
        db_session,
        email=unique_email("tutor"),
        display_name="Tutor User",
    )
    set_current_user(user)
    set_gateway(FakeAiGateway())
    client_conversation_id = str(uuid.uuid4())

    create_response = await client.post(
        CONVERSATIONS_PATH,
        json={
            "topic": "Du lịch",
            "client_conversation_id": client_conversation_id,
            "difficulty": "N3",
            "scenario": "Hỏi bạn về kế hoạch đi Kyoto.",
            "explanation_language": "en",
        },
    )

    assert create_response.status_code == 201
    conversation = create_response.json()
    conversation_id = conversation["conversation_id"]
    assert conversation["status"] == "active"
    assert conversation["topic"] == "Du lịch"
    assert conversation["scenario"] == "Hỏi bạn về kế hoạch đi Kyoto."
    assert conversation["explanation_language"] == "en"
    assert "scenario_id" not in conversation
    assert conversation["started_at"]
    assert conversation["ended_at"] is None
    assert len(conversation["messages"]) == 1
    assert conversation["messages"][0]["sequence_number"] == 1
    assert conversation["messages"][0]["text_meaning"]["language"] == "en"
    assert conversation["messages"][0]["text_meaning"]["text"]
    assert conversation["messages"][0]["feedback"]["answer_hints"]
    assert conversation["messages"][0]["feedback"]["explanation_language"] == "en"
    assert (
        conversation["messages"][0]["feedback"]["answer_hints"][0]["text_meaning"]["language"]
        == "en"
    )

    replay_response = await client.post(
        CONVERSATIONS_PATH,
        json={
            "topic": "Du lịch",
            "client_conversation_id": client_conversation_id,
            "difficulty": "N3",
            "scenario": "Hỏi bạn về kế hoạch đi Kyoto.",
            "explanation_language": "en",
        },
    )
    assert replay_response.status_code == 201
    assert replay_response.json()["conversation_id"] == conversation_id
    assert replay_response.json()["messages"][0]["id"] == conversation["messages"][0]["id"]

    client_message_id = str(uuid.uuid4())
    message_payload = {
        "text": "京都に行きたいです。",
        "client_message_id": client_message_id,
    }
    message_response = await client.post(
        f"{CONVERSATIONS_PATH}/{conversation_id}/messages",
        json=message_payload,
    )

    assert message_response.status_code == 200
    first_result = message_response.json()
    assert first_result["user_message"]["sequence_number"] == 2
    assert first_result["ai_reply"]["sequence_number"] == 3
    assert first_result["user_message"]["client_message_id"] == client_message_id
    assert first_result["user_message"]["text_meaning"] is None
    assert first_result["ai_reply"]["text_meaning"]["language"] == "en"
    assert first_result["ai_reply"]["text_meaning"]["text"]

    retry_response = await client.post(
        f"{CONVERSATIONS_PATH}/{conversation_id}/messages",
        json=message_payload,
    )

    assert retry_response.status_code == 200
    retry_result = retry_response.json()
    assert retry_result["user_message"]["id"] == first_result["user_message"]["id"]
    assert retry_result["ai_reply"]["id"] == first_result["ai_reply"]["id"]

    detail_response = await client.get(f"{CONVERSATIONS_PATH}/{conversation_id}")
    assert detail_response.status_code == 200
    assert detail_response.json()["explanation_language"] == "en"
    assert [message["sequence_number"] for message in detail_response.json()["messages"]] == [
        1,
        2,
        3,
    ]

    list_response = await client.get(CONVERSATIONS_PATH)
    assert list_response.status_code == 200
    assert list_response.json()["total_items"] == 1
    assert list_response.json()["items"][0]["explanation_language"] == "en"
    assert list_response.json()["items"][0]["last_message_text"] == first_result["ai_reply"]["text"]

    delete_response = await client.delete(f"{CONVERSATIONS_PATH}/{conversation_id}")
    assert delete_response.status_code == 204
    assert (await client.delete(f"{CONVERSATIONS_PATH}/{conversation_id}")).status_code == 204

    persisted_messages = list(
        (
            await db_session.scalars(
                select(TutorMessage).where(TutorMessage.session_id == uuid.UUID(conversation_id))
            )
        ).all()
    )
    assert len(persisted_messages) == 3

    deleted_detail_response = await client.get(f"{CONVERSATIONS_PATH}/{conversation_id}")
    assert deleted_detail_response.status_code == 404
    assert (await client.get(CONVERSATIONS_PATH)).json()["total_items"] == 0


@pytest.mark.asyncio
async def test_ai_tutor_delete_is_idempotent_and_releases_create_key(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_email: Callable[[str], str],
) -> None:
    user = await create_user(
        db_session,
        email=unique_email("delete-reuse"),
        display_name="Delete Reuse User",
    )
    set_current_user(user)
    set_gateway(FakeAiGateway())
    payload = {
        "topic": "Du lịch",
        "client_conversation_id": str(uuid.uuid4()),
        "difficulty": "N3",
    }

    first_response = await client.post(CONVERSATIONS_PATH, json=payload)
    first_id = first_response.json()["conversation_id"]
    assert first_response.status_code == 201

    assert (await client.delete(f"{CONVERSATIONS_PATH}/{first_id}")).status_code == 204
    assert (await client.delete(f"{CONVERSATIONS_PATH}/{uuid.uuid4()}")).status_code == 204

    second_response = await client.post(CONVERSATIONS_PATH, json=payload)
    assert second_response.status_code == 201
    assert second_response.json()["conversation_id"] != first_id


@pytest.mark.asyncio
async def test_ai_tutor_rejects_create_idempotency_payload_conflict(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_email: Callable[[str], str],
) -> None:
    user = await create_user(
        db_session,
        email=unique_email("create-conflict"),
        display_name="Create Conflict User",
    )
    set_current_user(user)
    set_gateway(FakeAiGateway())
    client_conversation_id = str(uuid.uuid4())

    first_response = await client.post(
        CONVERSATIONS_PATH,
        json={
            "topic": "Du lịch",
            "client_conversation_id": client_conversation_id,
            "difficulty": "N3",
        },
    )
    assert first_response.status_code == 201

    conflict_response = await client.post(
        CONVERSATIONS_PATH,
        json={
            "topic": "Công việc",
            "client_conversation_id": client_conversation_id,
            "difficulty": "N3",
        },
    )
    assert conflict_response.status_code == 409
    assert conflict_response.json()["error"]["code"] == ("tutor_conversation_idempotency_conflict")
    assert (await client.get(CONVERSATIONS_PATH)).json()["total_items"] == 1


@pytest.mark.asyncio
async def test_ai_tutor_rejects_cross_user_access(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_email: Callable[[str], str],
) -> None:
    user_a = await create_user(
        db_session,
        email=unique_email("user-a"),
        display_name="User A",
    )
    user_b = await create_user(
        db_session,
        email=unique_email("user-b"),
        display_name="User B",
    )
    set_current_user(user_a)
    set_gateway(FakeAiGateway())
    client_conversation_id = str(uuid.uuid4())

    create_response = await client.post(
        CONVERSATIONS_PATH,
        json={
            "topic": "Công việc",
            "client_conversation_id": client_conversation_id,
            "difficulty": "N4",
        },
    )
    conversation_id = create_response.json()["conversation_id"]

    set_current_user(user_b)
    same_key_create_response = await client.post(
        CONVERSATIONS_PATH,
        json={
            "topic": "Công việc",
            "client_conversation_id": client_conversation_id,
            "difficulty": "N4",
        },
    )
    assert same_key_create_response.status_code == 201
    assert same_key_create_response.json()["conversation_id"] != conversation_id

    get_response = await client.get(f"{CONVERSATIONS_PATH}/{conversation_id}")
    send_response = await client.post(
        f"{CONVERSATIONS_PATH}/{conversation_id}/messages",
        json={"text": "こんにちは", "client_message_id": str(uuid.uuid4())},
    )
    delete_response = await client.delete(f"{CONVERSATIONS_PATH}/{conversation_id}")
    assert get_response.status_code == 403
    assert send_response.status_code == 403
    assert delete_response.status_code == 403
    assert get_response.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_ai_tutor_preserves_user_message_when_gateway_times_out(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_email: Callable[[str], str],
) -> None:
    user = await create_user(
        db_session,
        email=unique_email("timeout"),
        display_name="Timeout User",
    )
    set_current_user(user)
    set_gateway(FakeAiGateway())
    client_conversation_id = str(uuid.uuid4())

    create_response = await client.post(
        CONVERSATIONS_PATH,
        json={
            "topic": "Du lịch",
            "client_conversation_id": client_conversation_id,
            "difficulty": "N3",
        },
    )
    conversation_id = create_response.json()["conversation_id"]
    set_gateway(TimeoutGateway())

    client_message_id = str(uuid.uuid4())
    timeout_response = await client.post(
        f"{CONVERSATIONS_PATH}/{conversation_id}/messages",
        json={"text": "京都に行きたいです。", "client_message_id": client_message_id},
    )

    assert timeout_response.status_code == 503
    assert timeout_response.json()["error"]["code"] == "service_unavailable"

    detail_response = await client.get(f"{CONVERSATIONS_PATH}/{conversation_id}")
    assert detail_response.status_code == 200
    messages = detail_response.json()["messages"]
    assert messages[-1]["sender"] == "user"
    assert messages[-1]["client_message_id"] == client_message_id


@pytest.mark.asyncio
async def test_ai_tutor_openapi_contains_all_five_operations() -> None:
    paths = app.openapi()["paths"]
    expected_paths = {
        "/api/v1/ai-tutor/conversations",
        "/api/v1/ai-tutor/conversations/{conversation_id}",
        "/api/v1/ai-tutor/conversations/{conversation_id}/messages",
    }

    assert expected_paths <= paths.keys()
    assert "/api/v1/ai-tutor/topics" not in paths
    assert "/api/v1/ai-tutor/scenarios" not in paths
    operation_ids = {
        operation["operationId"]
        for path in expected_paths
        for operation in paths[path].values()
        if isinstance(operation, dict) and "operationId" in operation
    }
    assert operation_ids == {
        "createTutorConversation",
        "listTutorConversations",
        "getTutorConversation",
        "sendTutorMessage",
        "deleteTutorConversation",
    }
    for path in expected_paths:
        for operation in paths[path].values():
            if not isinstance(operation, dict) or "operationId" not in operation:
                continue
            validation_schema = operation["responses"]["422"]["content"]["application/json"][
                "schema"
            ]
            assert validation_schema["$ref"].endswith("/ErrorResponse")


@pytest.mark.asyncio
async def test_ai_tutor_validation_errors_use_common_error_envelope(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_email: Callable[[str], str],
) -> None:
    user = await create_user(
        db_session,
        email=unique_email("validation"),
        display_name="Validation User",
    )
    set_current_user(user)
    set_gateway(FakeAiGateway())

    response = await client.post(
        CONVERSATIONS_PATH,
        json={"difficulty": "N3"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert response.json()["error"]["details"]
