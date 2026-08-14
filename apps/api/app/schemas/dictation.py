import uuid
from datetime import datetime
from typing import Self

from pydantic import BaseModel, Field, model_validator

from app.models.enums import AttemptStatus


class DictationTranscriptSegment(BaseModel):
    """Internal validated representation of a stored transcript segment."""

    start_time_ms: int = Field(ge=0)
    end_time_ms: int = Field(gt=0)
    script: str = Field(min_length=1)

    @model_validator(mode="after")
    def validate_time_range(self) -> Self:
        if self.end_time_ms <= self.start_time_ms:
            raise ValueError("end_time_ms must be greater than start_time_ms")
        return self


class DictationSegmentItem(BaseModel):
    segment_index: int = Field(ge=0)
    start_time_ms: int = Field(ge=0)
    end_time_ms: int = Field(gt=0)


class DictationStartResponse(BaseModel):
    attempt_id: uuid.UUID
    content_id: uuid.UUID
    attempt_number: int = Field(ge=1)
    audio_url: str = Field(min_length=1)
    total_segments: int = Field(ge=1)
    segments: list[DictationSegmentItem] = Field(min_length=1)


class DictationSegmentCheckRequest(BaseModel):
    attempt_id: uuid.UUID
    segment_index: int
    user_answer: str


class DictationSegmentCheckResponse(BaseModel):
    segment_index: int = Field(ge=0)
    is_correct: bool
    user_answer: str
    correct_script: str
    is_last_segment: bool


class DictationAnswerPayload(BaseModel):
    """Internal validated representation of incremental Dictation answers."""

    segments: list[DictationSegmentCheckResponse] = Field(default_factory=list)


class DictationCompleteRequest(BaseModel):
    attempt_id: uuid.UUID


class DictationCompleteResponse(BaseModel):
    attempt_id: uuid.UUID
    status: AttemptStatus
    score: float = Field(ge=0, le=100)
    correct_count: int = Field(ge=0)
    total_count: int = Field(ge=1)
    earned_exp: int = Field(ge=0)
    completed_at: datetime


class DictationSegmentReview(BaseModel):
    segment_index: int = Field(ge=0)
    user_answer: str
    correct_script: str
    is_correct: bool


class DictationAttemptReviewResponse(BaseModel):
    attempt_id: uuid.UUID
    status: AttemptStatus
    score: float | None = Field(ge=0, le=100)
    earned_exp: int = Field(ge=0)
    details: list[DictationSegmentReview]
