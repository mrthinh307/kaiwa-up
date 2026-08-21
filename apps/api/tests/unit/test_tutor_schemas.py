import uuid
from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.models.enums import JlptLevel, TutorSender
from app.schemas.tutor import (
    TutorAnswerHintResponse,
    TutorConversationCreateRequest,
    TutorConversationDetailResponse,
    TutorFeedbackResponse,
    TutorMessageCreateRequest,
    TutorMessageResponse,
)


def test_conversation_create_requires_topic_and_accepts_optional_scenario() -> None:
    request = TutorConversationCreateRequest(
        topic="  Du lịch Nhật Bản  ",
        difficulty=JlptLevel.N3,
        scenario="  Hỏi bạn về kế hoạch đi Kyoto.  ",
    )

    assert request.topic == "Du lịch Nhật Bản"
    assert request.difficulty is JlptLevel.N3
    assert request.scenario == "Hỏi bạn về kế hoạch đi Kyoto."


def test_conversation_create_normalizes_blank_scenario_to_none() -> None:
    request = TutorConversationCreateRequest(
        topic="Du lịch Nhật Bản",
        difficulty="N3",
        scenario="   ",
    )

    assert request.scenario is None


def test_conversation_create_requires_topic_and_rejects_catalog_field() -> None:
    with pytest.raises(ValidationError):
        TutorConversationCreateRequest(difficulty=JlptLevel.N3)

    with pytest.raises(ValidationError):
        TutorConversationCreateRequest(
            topic="Du lịch",
            difficulty=JlptLevel.N3,
            scenario_id=uuid.uuid4(),
        )


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
        text_vi="Xin chào!",
        created_at=datetime(2026, 8, 19, tzinfo=UTC),
        feedback=TutorFeedbackResponse(
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
    assert payload["text_vi"] == "Xin chào!"
    assert payload["feedback"]["answer_hints"][0] == {
        "text": "京都に行きたいです。",
        "meaning_vi": "Tôi muốn đi Kyoto.",
    }


def test_conversation_detail_response_validates_status() -> None:
    now = datetime(2026, 8, 19, tzinfo=UTC)
    detail = TutorConversationDetailResponse(
        conversation_id=uuid.uuid4(),
        topic="Du lịch Nhật Bản",
        difficulty=JlptLevel.N3,
        status="active",
        started_at=now,
    )
    assert detail.messages == []
    assert detail.ended_at is None
