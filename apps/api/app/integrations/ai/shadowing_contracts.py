"""Structured, segment-addressed text review contracts; independent of other evaluations."""

import unicodedata
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.exceptions.ai import AiInvalidResponseError

type ShortHint = Annotated[str, Field(min_length=1, max_length=500)]


class ShadowingEvaluationCoverage(BaseModel):
    total: int = Field(default=0, ge=0)
    recorded: int = Field(default=0, ge=0)
    completed: int = Field(default=0, ge=0)
    no_speech: int = Field(default=0, ge=0)
    failed: int = Field(default=0, ge=0)
    unavailable: int = Field(default=0, ge=0)
    not_evaluable: int = Field(default=0, ge=0)


class ShadowingEvaluationSegment(BaseModel):
    segment_index: int = Field(ge=0)
    reference: str = Field(min_length=1, max_length=20000)
    learner: str = Field(min_length=1, max_length=20000)
    reference_length: int = Field(gt=0)


class ShadowingEvaluationInput(BaseModel):
    mode: Literal["segmented", "continuous"] = "segmented"
    segments: list[ShadowingEvaluationSegment] = Field(min_length=1, max_length=20)
    coverage: ShadowingEvaluationCoverage = Field(default_factory=ShadowingEvaluationCoverage)


class ShadowingSegmentScore(BaseModel):
    segment_index: int = Field(ge=0)
    score: float = Field(ge=0, le=100, allow_inf_nan=False)


class ShadowingIndexedCorrection(BaseModel):
    segment_index: int = Field(ge=0)
    original: str = Field(max_length=500)
    corrected: str = Field(max_length=500)
    reason: str = Field(min_length=1, max_length=1000)


class ShadowingEvaluationResult(BaseModel):
    segments: list[ShadowingSegmentScore] = Field(max_length=20)
    feedback: str = Field(min_length=1, max_length=2000)
    corrections: list[ShadowingIndexedCorrection] = Field(default_factory=list, max_length=3)
    hints: list[ShortHint] = Field(default_factory=list, max_length=3)
    provider: str | None = None
    model: str | None = None


class ShadowingSummaryInput(BaseModel):
    mode: Literal["segmented", "continuous"] = "segmented"
    overall_score: float | None = Field(ge=0, le=100)
    evaluated_segments: int = Field(ge=0)
    coverage: ShadowingEvaluationCoverage = Field(default_factory=ShadowingEvaluationCoverage)
    corrections: list[ShadowingIndexedCorrection] = Field(default_factory=list, max_length=10)
    score_distribution: dict[str, int] = Field(default_factory=dict)


class ShadowingSummaryResult(BaseModel):
    feedback: str = Field(min_length=1, max_length=2000)
    correction_indices: list[int] = Field(default_factory=list, max_length=10)
    hints: list[ShortHint] = Field(default_factory=list, max_length=3)
    provider: str | None = None
    model: str | None = None


def _without_punctuation(text: str) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFKC", text)
        if not character.isspace() and not unicodedata.category(character).startswith("P")
    )


def validate_shadowing_evaluation(
    payload: ShadowingEvaluationInput, result: ShadowingEvaluationResult
) -> ShadowingEvaluationResult:
    expected = {segment.segment_index: segment for segment in payload.segments}
    received = [segment.segment_index for segment in result.segments]
    if (
        len(expected) != len(payload.segments)
        or len(set(received)) != len(received)
        or set(received) != set(expected)
    ):
        raise AiInvalidResponseError("Shadowing evaluation did not preserve segment identifiers")
    for correction in result.corrections:
        segment = expected.get(correction.segment_index)
        if (
            segment is None
            or correction.original not in segment.learner
            or correction.corrected not in segment.reference
            or _without_punctuation(correction.original)
            == _without_punctuation(correction.corrected)
        ):
            raise AiInvalidResponseError("Shadowing correction does not match its segment evidence")
    return result


def validate_shadowing_summary(
    payload: ShadowingSummaryInput, result: ShadowingSummaryResult
) -> ShadowingSummaryResult:
    indices = result.correction_indices
    if len(set(indices)) != len(indices) or any(
        index < 0 or index >= len(payload.corrections) for index in indices
    ):
        raise AiInvalidResponseError("Shadowing summary refers to unknown correction evidence")
    return result
