import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import AttemptStatus, ContentType


class ProgressSummaryResponse(BaseModel):
    shadowing_dictation_completed: int = Field(ge=0)
    reflex_completed: int = Field(ge=0)
    listening_translation_completed: int = Field(ge=0)
    total_completed_attempts: int = Field(ge=0)
    total_attempts: int = Field(ge=0)


class ProgressAttemptItem(BaseModel):
    id: uuid.UUID
    content_id: uuid.UUID
    content_title: str
    content_type: ContentType
    attempt_number: int = Field(ge=1)
    status: AttemptStatus
    score: float | None = None
    completed_at: datetime | None = None


class ProgressAttemptDetail(BaseModel):
    id: uuid.UUID
    content_id: uuid.UUID
    content_type: ContentType
    attempt_number: int = Field(ge=1)
    status: AttemptStatus
    score: float | None = None
    answer_payload: dict[str, object] | None = None
    completed_at: datetime | None = None
