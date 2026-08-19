import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import JlptLevel


class ReflexLessonItem(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    topic: str | None = None
    difficulty: JlptLevel
    audio_url: str | None = None
    prompt_ja: str
    response_start_limit_ms: int


class ReflexLessonDetail(ReflexLessonItem):
    scenario_ja: str | None = None


class ReflexEvaluationResponse(BaseModel):
    attempt_id: uuid.UUID
    evaluation_id: uuid.UUID
    transcript: str
    score: int = Field(ge=0, le=100)
    is_on_time: bool
    feedback: str
    corrections: list[dict[str, str]]
    hints: list[str]
    earned_exp: int = Field(ge=0)
    review_due_at: datetime
    review_interval_days: int


class ReviewScheduleItem(BaseModel):
    content_id: uuid.UUID
    title: str
    due_at: datetime
    interval_days: int
    ease_factor: float
    repetitions: int
    last_attempt_id: uuid.UUID | None = None
