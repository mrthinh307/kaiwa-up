"""Public request and response schemas for AI Tutor APIs."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import JlptLevel, TutorSender
from app.schemas.pagination import PaginatedResponse

TutorSessionStatus = Literal["active", "completed"]


class TutorScenarioResponse(BaseModel):
    """An active scenario available in the Tutor catalog."""

    id: uuid.UUID
    slug: str
    topic: str
    title: str
    scenario: str
    display_order: int = Field(ge=0)


class TutorConversationCreateRequest(BaseModel):
    """Parameters for a catalog-based or free-form Tutor conversation."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    scenario_id: uuid.UUID | None = None
    topic: str | None = Field(default=None, min_length=1, max_length=255)
    difficulty: JlptLevel

    @model_validator(mode="after")
    def require_scenario_or_topic(self) -> "TutorConversationCreateRequest":
        if self.scenario_id is None and self.topic is None:
            raise ValueError("scenario_id or topic is required")
        return self


class TutorAnswerHintResponse(BaseModel):
    """A short answer suggestion and its Vietnamese meaning."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=255)
    meaning_vi: str = Field(min_length=1, max_length=500)


class TutorFeedbackResponse(BaseModel):
    """Normalized feedback attached to an AI Tutor message."""

    model_config = ConfigDict(extra="forbid")

    next_question: str | None = Field(default=None, max_length=2000)
    grammar_correction: str | None = Field(default=None, max_length=2000)
    natural_expression_tip: str | None = Field(default=None, max_length=2000)
    answer_hints: list[TutorAnswerHintResponse] = Field(default_factory=list, max_length=3)


class TutorMessageResponse(BaseModel):
    """A persisted Tutor message in sequence order."""

    id: uuid.UUID
    sender: TutorSender
    sequence_number: int = Field(ge=1)
    text: str = Field(min_length=1, max_length=2000)
    client_message_id: uuid.UUID | None = None
    created_at: datetime
    feedback: TutorFeedbackResponse | None = None


class TutorConversationFields(BaseModel):
    """Fields shared by Tutor conversation responses."""

    conversation_id: uuid.UUID
    scenario_id: uuid.UUID | None = None
    topic: str
    difficulty: JlptLevel
    scenario: str | None = None
    status: TutorSessionStatus


class TutorConversationCreateResponse(TutorConversationFields):
    """Response returned after creating a conversation and its opening AI message."""

    initial_message: TutorMessageResponse


class TutorConversationListItem(TutorConversationFields):
    """Compact conversation item used by the history endpoint."""

    last_message_text: str | None = None
    updated_at: datetime


class TutorConversationListResponse(PaginatedResponse[TutorConversationListItem]):
    """Paginated Tutor conversation history."""


class TutorConversationDetailResponse(TutorConversationFields):
    """Conversation metadata and its complete ordered message history."""

    started_at: datetime
    ended_at: datetime | None = None
    messages: list[TutorMessageResponse] = Field(default_factory=list)


class TutorMessageCreateRequest(BaseModel):
    """A text message and its client-generated idempotency key."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    text: str = Field(min_length=1, max_length=2000)
    client_message_id: uuid.UUID


class TutorMessageCreateResponse(BaseModel):
    """The persisted user message and the generated AI reply."""

    user_message: TutorMessageResponse
    ai_reply: TutorMessageResponse


class TutorConversationCompleteResponse(BaseModel):
    """Response returned when a conversation is completed."""

    conversation_id: uuid.UUID
    status: Literal["completed"]
    ended_at: datetime
