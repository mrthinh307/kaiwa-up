"""Normalized AI result contracts and response parsing helpers."""

import json
from typing import Any, TypeVar

from pydantic import BaseModel, Field, ValidationError

from app.exceptions.ai import AiInvalidResponseError


class Correction(BaseModel):
    """A single language correction returned by an evaluator."""

    original: str
    corrected: str
    reason: str


class TutorAnswerHint(BaseModel):
    """A short Japanese answer suggestion and its Vietnamese meaning."""

    text: str
    meaning_vi: str


class TranscriptionSegment(BaseModel):
    """A timed slice of a transcription."""

    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    text: str
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class TranscriptionResult(BaseModel):
    """Normalized speech-to-text output."""

    text: str
    language: str
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    segments: list[TranscriptionSegment] = Field(default_factory=list)


class EvaluationResult(BaseModel):
    """Normalized score, feedback and corrections for a learner answer."""

    score: int = Field(ge=0, le=100)
    is_acceptable: bool
    feedback: str
    corrections: list[Correction] = Field(default_factory=list)
    hints: list[str] = Field(default_factory=list)
    covered_ideas: list[str] = Field(default_factory=list)
    missing_ideas: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


class TutorReply(BaseModel):
    """Normalized AI Tutor response."""

    message: str
    text_vi: str
    corrections: list[Correction] = Field(default_factory=list)
    natural_expression_tip: str | None = None
    answer_hints: list[TutorAnswerHint] = Field(default_factory=list, max_length=3)


def tutor_reply_ends_with_question(message: str) -> bool:
    """Return whether a non-opening Tutor message ends with a Japanese question."""
    normalized = message.rstrip()
    return normalized.endswith(("?", "？", "か。", "でしょうか。", "かな。"))


M = TypeVar("M", bound=BaseModel)


def parse_json_content(content: str) -> dict[str, Any]:
    """Parse provider JSON text into a mapping or raise AiInvalidResponseError."""
    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise AiInvalidResponseError("AI provider returned invalid JSON") from exc
    if not isinstance(data, dict):
        raise AiInvalidResponseError("AI provider returned a non-object JSON value")
    return data


def parse_evaluation_result(content: str) -> EvaluationResult:
    """Build an EvaluationResult from a provider JSON string."""
    return _model_from_mapping(
        EvaluationResult,
        parse_json_content(content),
        kind="evaluation result",
    )


def parse_tutor_reply(content: str) -> TutorReply:
    """Build a TutorReply from a provider JSON string."""
    return _model_from_mapping(
        TutorReply,
        parse_json_content(content),
        kind="tutor reply",
    )


def parse_transcription_result(data: dict[str, Any], *, language: str) -> TranscriptionResult:
    """Build a TranscriptionResult from a provider transcription payload."""
    text = data.get("text")
    if not isinstance(text, str) or not text.strip():
        raise AiInvalidResponseError("AI provider returned a transcription without text")

    segments: list[TranscriptionSegment] = []
    raw_segments = data.get("segments")
    if isinstance(raw_segments, list):
        for raw_segment in raw_segments:
            if not isinstance(raw_segment, dict):
                continue
            segment_text = raw_segment.get("text")
            if not isinstance(segment_text, str):
                continue
            segments.append(
                TranscriptionSegment(
                    start_ms=_to_milliseconds(raw_segment.get("start")),
                    end_ms=_to_milliseconds(raw_segment.get("end")),
                    text=segment_text,
                    confidence=_to_float(raw_segment.get("confidence"), 1.0),
                )
            )

    return TranscriptionResult(
        text=text,
        language=language,
        confidence=_to_float(data.get("confidence"), 1.0),
        segments=segments,
    )


def _model_from_mapping[M: BaseModel](model: type[M], data: dict[str, Any], *, kind: str) -> M:
    try:
        return model.model_validate(data)
    except ValidationError as exc:
        raise AiInvalidResponseError(f"AI provider returned an invalid {kind}") from exc


def _to_milliseconds(value: Any) -> int:
    if isinstance(value, (int, float)):
        return round(float(value) * 1000)
    return 0


def _to_float(value: Any, default: float) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    return default
