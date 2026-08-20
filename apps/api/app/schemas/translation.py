"""Public schemas for Listening & Translation."""

import uuid

from pydantic import BaseModel, Field, field_validator

from app.models.enums import AttemptStatus, JlptLevel


class TranslationLessonItem(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    difficulty: JlptLevel
    topic: str | None = None
    duration_seconds: float | None = Field(default=None, ge=0)
    audio_url: str
    is_completed: bool


class TranslationLessonDetail(TranslationLessonItem):
    """Answer-safe lesson detail shown before submission."""


class TranslationSubmissionCreate(BaseModel):
    translation_vi: str = Field(min_length=1, max_length=2_000)

    @field_validator("translation_vi")
    @classmethod
    def normalize_translation(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("translation_vi must not be blank")
        return normalized


class TranslationEvaluationDetails(BaseModel):
    is_acceptable: bool
    covered_ideas: list[str]
    missing_ideas: list[str]
    suggestions: list[str]


class TranslationSubmissionResponse(TranslationEvaluationDetails):
    attempt_id: uuid.UUID
    evaluation_id: uuid.UUID
    status: AttemptStatus
    exp_earned: int = Field(ge=0)
    score: int = Field(ge=0, le=100)
    feedback: str
    reference_translation_vi: str
