import uuid
from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl

from app.models.enums import ContentStatus, ContentType, JlptLevel


class LearningContentCreate(BaseModel):
    youtube_url: HttpUrl
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    topic: str | None = Field(default=None, min_length=1, max_length=100)
    difficulty: JlptLevel = JlptLevel.N5
    base_exp: int = Field(default=50, gt=0)


class LearningContentItem(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    content_type: ContentType
    difficulty: JlptLevel
    topic: str | None = None
    duration_seconds: float | None = Field(default=None, ge=0)
    audio_url: str | None = None


class LearningContentDetail(LearningContentItem):
    published_at: datetime | None = None


class TranscriptSegment(BaseModel):
    start_time_ms: int = Field(ge=0)
    end_time_ms: int = Field(ge=0)
    script: str


class ShadowingContentDetail(LearningContentDetail):
    transcript: list[TranscriptSegment]


class LearningContentCreateResponse(ShadowingContentDetail):
    slug: str
    status: ContentStatus


class DictationPromptSegment(BaseModel):
    blank_index: int = Field(ge=1)
    start_time_ms: int = Field(ge=0)
    end_time_ms: int = Field(ge=0)
    prompt: str


class DictationContentDetail(LearningContentDetail):
    prompts: list[DictationPromptSegment]
