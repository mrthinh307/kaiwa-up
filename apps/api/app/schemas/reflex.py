import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import JlptLevel


class ReflexLessonItem(BaseModel):
    id: uuid.UUID
    title: str
    difficulty: JlptLevel
    is_completed: bool


class ReflexLessonListResponse(BaseModel):
    items: list[ReflexLessonItem]
    total_items: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total_pages: int = Field(ge=0)


class ReflexLessonDetail(BaseModel):
    id: uuid.UUID
    title: str
    audio_url: str
    prompt_ja: str
    scenario_ja: str | None = None
    response_start_limit_seconds: int = Field(ge=0)


class ReflexAiFeedback(BaseModel):
    transcribed_text: str
    naturalness_evaluation: str
    suggestions: str


class ReflexEvaluationResponse(BaseModel):
    attempt_id: uuid.UUID
    lesson_id: uuid.UUID
    response_start_ms: int = Field(ge=0)
    is_on_time: bool
    ai_score: float = Field(ge=0, le=100)
    ai_feedback: ReflexAiFeedback
    next_review_days: int
    next_review_at: datetime
    exp_earned: int = Field(ge=0)


class DueReviewItem(BaseModel):
    lesson_id: uuid.UUID
    lesson_title: str
    last_score: float
    due_at: datetime


class DueReviewListResponse(BaseModel):
    due_count: int = Field(ge=0)
    items: list[DueReviewItem]


class ReviewScheduleItem(BaseModel):
    lesson_id: uuid.UUID
    lesson_title: str
    interval_days: int
    review_count: int
    next_review_at: datetime


class ReviewScheduleListResponse(BaseModel):
    items: list[ReviewScheduleItem]
