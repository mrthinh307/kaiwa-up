import enum
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.enums import AttemptStatus
from app.schemas.learning_content import ShadowingContentDetail


class ShadowingMode(enum.StrEnum):
    SEGMENTED = "segmented"
    CONTINUOUS = "continuous"


class ShadowingStartRequest(BaseModel):
    mode: ShadowingMode


class ShadowingStartResponse(BaseModel):
    attempt_id: uuid.UUID
    content_id: uuid.UUID
    attempt_number: int = Field(ge=1)
    mode: ShadowingMode
    total_segments: int = Field(ge=1)
    total_attempts: int = Field(ge=1)


class ShadowingRecordSegmentResponse(BaseModel):
    recording_id: uuid.UUID
    attempt_id: uuid.UUID
    segment_id: str
    storage_key: str
    duration_seconds: int
    created_at: datetime
    duration_ms: int | None = None


class ShadowingRecordContinuousResponse(BaseModel):
    recording_id: uuid.UUID
    attempt_id: uuid.UUID
    storage_key: str
    duration_seconds: int
    created_at: datetime
    duration_ms: int | None = None


class ShadowingRecordingPlaybackResponse(BaseModel):
    recording_id: uuid.UUID
    playback_url: str
    duration_seconds: int
    created_at: datetime


class ShadowingSubmittedRecording(BaseModel):
    segment_index: int = Field(ge=0)
    recording_id: uuid.UUID


class ShadowingSubmitRequest(BaseModel):
    attempt_id: uuid.UUID
    replay_count: int = Field(default=0, ge=0)
    request_ai_review: bool = Field(default=False, json_schema_extra={"deprecated": True})
    recordings: list[ShadowingSubmittedRecording] | None = Field(default=None, max_length=10000)


class ShadowingUserProgressSummary(BaseModel):
    total_exp: int
    current_level: int
    exp_to_next_level: int


class ShadowingWordStatus(enum.StrEnum):
    CORRECT = "correct"
    INCORRECT = "incorrect"
    MISSING = "missing"


class ShadowingWordFeedback(BaseModel):
    word: str
    status: ShadowingWordStatus
    user_word: str | None = None
    reference_start: int | None = Field(default=None, ge=0)
    reference_end: int | None = Field(default=None, ge=0)
    learner_start: int | None = Field(default=None, ge=0)
    learner_end: int | None = Field(default=None, ge=0)


class ShadowingTextSpan(BaseModel):
    """Half-open Unicode character offsets in the original, unnormalized transcript."""

    start: int = Field(ge=0)
    end: int = Field(ge=0)
    text: str


class ShadowingComparison(BaseModel):
    version: int = 2
    score: float | None = Field(default=None, ge=0, le=100)
    reference_length: int = Field(ge=0)
    words: list[ShadowingWordFeedback] = Field(default_factory=list)
    extra_spans: list[ShadowingTextSpan] = Field(default_factory=list)


class ShadowingCorrection(BaseModel):
    original: str
    corrected: str
    reason: str
    segment_index: int | None = Field(default=None, ge=0)


class ShadowingAiFeedback(BaseModel):
    similarity_score: float | None = None
    fluency_score: float | None = None
    feedback: str | None = None
    corrections: list[ShadowingCorrection] = Field(default_factory=list)
    hints: list[str] = Field(default_factory=list)
    user_transcript: str | None = None
    words: list[ShadowingWordFeedback] = Field(default_factory=list)
    coverage: dict[str, int] = Field(default_factory=dict)
    provider: str | None = None
    model: str | None = None
    prompt_version: int | None = None


ShadowingTranscriptionStatus = Literal[
    "not_recorded",
    "not_requested",
    "queued",
    "processing",
    "completed",
    "no_speech",
    "failed",
    "unavailable",
    "not_evaluable",
]


class ShadowingTranscriptionProgress(BaseModel):
    is_delayed: bool = False
    status: Literal[
        "not_requested",
        "queued",
        "processing",
        "completed",
        "partial_failed",
        "failed",
        "unavailable",
    ] = "not_requested"
    total: int = 0
    recorded: int = 0
    queued: int = 0
    processing: int = 0
    completed: int = 0
    no_speech: int = 0
    failed: int = 0
    unavailable: int = 0
    not_evaluable: int = 0
    not_requested: int = 0


class ShadowingAiReviewState(BaseModel):
    is_delayed: bool = False
    status: Literal[
        "not_requested", "queued", "processing", "completed", "failed", "unavailable"
    ] = "not_requested"
    review_id: uuid.UUID | None = None
    error_code: str | None = None
    is_stale: bool = False
    is_partial: bool = False
    evaluated_segments: int = 0
    completed_batches: int = 0
    total_batches: int = 0
    feedback_review_id: uuid.UUID | None = None


class ShadowingAiReviewRequest(BaseModel):
    review_revision: int = Field(ge=0)
    allow_partial: bool = False


class ShadowingAiReviewResponse(BaseModel):
    attempt_id: uuid.UUID
    queued_jobs: int = Field(ge=0)
    review_revision: int = Field(ge=0)
    ai_review: ShadowingAiReviewState
    ai_feedback: ShadowingAiFeedback | None = None


class ShadowingTranscriptionRequest(BaseModel):
    segment_indices: list[int] | None = Field(default=None, max_length=10000)


class ShadowingProcessingResponse(BaseModel):
    attempt_id: uuid.UUID
    queued_jobs: int = Field(ge=0)
    review_revision: int = Field(ge=0)
    transcription: ShadowingTranscriptionProgress


class ShadowingSubmitResponse(BaseModel):
    attempt_id: uuid.UUID
    status: AttemptStatus
    score: float
    xp_earned: int
    content_type: str = "shadowing"
    difficulty: str
    message: str = "Bạn đã hoàn thành bài luyện."
    user_progress: ShadowingUserProgressSummary
    completed_at: datetime
    ai_feedback: ShadowingAiFeedback | None = None
    transcription: ShadowingTranscriptionProgress = Field(
        default_factory=ShadowingTranscriptionProgress
    )
    ai_review: ShadowingAiReviewState = Field(default_factory=ShadowingAiReviewState)
    review_revision: int = 0
    ai_review_deferred: bool = False


class ShadowingSegmentReviewItem(BaseModel):
    segment_index: int
    script: str
    start_time_ms: int = 0
    end_time_ms: int = 0
    recorded: bool
    recording_id: uuid.UUID | None = None
    playback_url: str | None = None
    duration_seconds: int | None = None
    user_transcript: str | None = None
    similarity_score: float | None = None
    words: list[ShadowingWordFeedback] = Field(default_factory=list)
    transcription_status: ShadowingTranscriptionStatus = "not_requested"
    error_code: str | None = None
    text_match_score: float | None = None
    comparison_version: int | None = None
    extra_spans: list[ShadowingTextSpan] = Field(default_factory=list)
    duration_ms: int | None = None
    completion_eligible: bool = False


class ShadowingAttemptReviewResponse(BaseModel):
    attempt_id: uuid.UUID
    attempt_number: int = Field(ge=1)
    content_id: uuid.UUID
    title: str
    difficulty: str
    mode: ShadowingMode = ShadowingMode.SEGMENTED
    audio_url: str | None = None
    status: AttemptStatus
    score: float | None = None
    earned_exp: int = 0
    completed_at: datetime | None = None
    total_segments: int
    completed_segments: int
    material_duration_seconds: float | None = None
    user_continuous_recording_url: str | None = None
    user_continuous_duration_seconds: int | None = None
    user_continuous_transcript: str | None = None
    ai_feedback: ShadowingAiFeedback | None = None
    segments: list[ShadowingSegmentReviewItem]
    transcription: ShadowingTranscriptionProgress = Field(
        default_factory=ShadowingTranscriptionProgress
    )
    ai_review: ShadowingAiReviewState = Field(default_factory=ShadowingAiReviewState)
    review_revision: int = 0
    reference_version: Literal["snapshot_v2", "legacy_reference_unversioned"] = (
        "legacy_reference_unversioned"
    )
    recorded_segments: int = 0


class ShadowingRecordedSegmentSummary(BaseModel):
    segment_id: str
    recording_id: uuid.UUID
    duration_seconds: int
    storage_key: str | None = None
    playback_url: str | None = None
    created_at: datetime


class ShadowingContinuousRecordingSummary(BaseModel):
    recording_id: uuid.UUID
    storage_key: str
    playback_url: str | None = None
    duration_seconds: int
    created_at: datetime | None = None


class ShadowingResumeResponse(BaseModel):
    attempt_id: uuid.UUID
    content_id: uuid.UUID
    attempt_number: int
    mode: ShadowingMode = ShadowingMode.SEGMENTED
    total_segments: int
    recorded_segments: list[ShadowingRecordedSegmentSummary] = Field(default_factory=list)
    continuous_recording: ShadowingContinuousRecordingSummary | None = None
    total_attempts: int = 0


class ShadowingAttemptPracticeResponse(BaseModel):
    content: ShadowingContentDetail
    attempt: ShadowingResumeResponse
