import uuid
from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.models.enums import JlptLevel, TutorSender
from app.schemas.tutor import (
    TutorAnswerHintResponse,
    TutorConversationCompleteResponse,
    TutorConversationCreateRequest,
    TutorConversationDetailResponse,
    TutorFeedbackResponse,
    TutorMessageCreateRequest,
    TutorMessageResponse,
)


def test_conversation_create_accepts_catalog_scenario_without_topic() -> None:
    scenario_id = uuid.uuid4()

    request = TutorConversationCreateRequest(
        scenario_id=scenario_id,
        difficulty=JlptLevel.N3,
    )

    assert request.scenario_id == scenario_id
    assert request.topic is None
    assert request.difficulty is JlptLevel.N3


def test_conversation_create_accepts_free_form_topic_without_scenario() -> None:
    request = TutorConversationCreateRequest(
        topic="  Du lịch Nhật Bản  ",
        difficulty="N3",
    )

    assert request.topic == "Du lịch Nhật Bản"
    assert request.scenario_id is None


def test_conversation_create_requires_scenario_or_topic() -> None:
    with pytest.raises(ValidationError, match="scenario_id or topic is required"):
        TutorConversationCreateRequest(difficulty=JlptLevel.N3)


def test_tutor_requests_forbid_unknown_fields_and_blank_text() -> None:
    with pytest.raises(ValidationError):
        TutorMessageCreateRequest(
            text="   ",
            client_message_id=uuid.uuid4(),
        )

    with pytest.raises(ValidationError):
        TutorMessageCreateRequest(
            text="こんにちは",
            client_message_id=uuid.uuid4(),
            unexpected="value",
        )


def test_feedback_limits_answer_hints_to_three() -> None:
    hints = [
        TutorAnswerHintResponse(text=f"Hint {index}", meaning_vi=f"Gợi ý {index}")
        for index in range(4)
    ]

    with pytest.raises(ValidationError):
        TutorFeedbackResponse(answer_hints=hints)


def test_message_response_serializes_public_sender_and_feedback_contract() -> None:
    message = TutorMessageResponse(
        id=uuid.uuid4(),
        sender=TutorSender.AI,
        sequence_number=1,
        text="こんにちは！",
        created_at=datetime(2026, 8, 19, tzinfo=UTC),
        feedback=TutorFeedbackResponse(
            next_question="どこに行きたいですか？",
            answer_hints=[
                TutorAnswerHintResponse(
                    text="京都に行きたいです。",
                    meaning_vi="Tôi muốn đi Kyoto.",
                )
            ],
        ),
    )

    payload = message.model_dump(mode="json")

    assert payload["sender"] == "ai"
    assert payload["feedback"]["answer_hints"][0] == {
        "text": "京都に行きたいです。",
        "meaning_vi": "Tôi muốn đi Kyoto.",
    }


def test_conversation_detail_and_complete_response_validate_status() -> None:
    conversation_id = uuid.uuid4()
    now = datetime(2026, 8, 19, tzinfo=UTC)
    detail = TutorConversationDetailResponse(
        conversation_id=conversation_id,
        topic="Du lịch Nhật Bản",
        difficulty=JlptLevel.N3,
        status="active",
        started_at=now,
    )
    completed = TutorConversationCompleteResponse(
        conversation_id=conversation_id,
        status="completed",
        ended_at=now,
    )

    assert detail.messages == []
    assert detail.ended_at is None
    assert completed.status == "completed"
