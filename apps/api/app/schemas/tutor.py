"""Public request and response schemas for AI Tutor APIs."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import JlptLevel, TutorSender
from app.schemas.pagination import PaginatedResponse

TutorSessionStatus = Literal["active", "completed"]


class TutorConversationCreateRequest(BaseModel):
    """User-provided context for a free-form Tutor conversation."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    topic: str = Field(min_length=1, max_length=255)
    difficulty: JlptLevel
    scenario: str | None = Field(default=None, max_length=2000)

    @field_validator("scenario", mode="before")
    @classmethod
    def normalize_optional_scenario(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip()
            return normalized or None
        return value


class TutorAnswerHintResponse(BaseModel):
    """A short answer suggestion and its Vietnamese meaning."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=255)
    meaning_vi: str = Field(min_length=1, max_length=500)


class TutorFeedbackResponse(BaseModel):
    """Normalized feedback attached to an AI Tutor message."""

    model_config = ConfigDict(extra="forbid")

    grammar_correction: str | None = Field(default=None, max_length=2000)
    natural_expression_tip: str | None = Field(default=None, max_length=2000)
    answer_hints: list[TutorAnswerHintResponse] = Field(default_factory=list, max_length=3)


class TutorMessageResponse(BaseModel):
    """A persisted Tutor message in sequence order."""

    id: uuid.UUID
    sender: TutorSender
    sequence_number: int = Field(ge=1)
    text: str = Field(min_length=1, max_length=2000)
    text_vi: str | None = Field(default=None, max_length=2000)
    client_message_id: uuid.UUID | None = None
    created_at: datetime
    feedback: TutorFeedbackResponse | None = None


class TutorConversationFields(BaseModel):
    """Fields shared by Tutor conversation responses."""

    conversation_id: uuid.UUID
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
