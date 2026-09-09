"""Bounded review batches and deterministic aggregation; never flatten segment boundaries."""

from typing import Literal

from app.exceptions.shadowing import ShadowingAiInputTooLongError
from app.integrations.ai.prompts.shadowing import (
    build_shadowing_batch_prompt,
    shadowing_prompt_fits,
)
from app.integrations.ai.shadowing_contracts import (
    ShadowingEvaluationCoverage,
    ShadowingEvaluationInput,
    ShadowingEvaluationSegment,
    ShadowingSegmentScore,
)

SHADOWING_PROMPT_VERSION = 2


def build_shadowing_batches(
    segments: list[ShadowingEvaluationSegment],
    *,
    coverage: ShadowingEvaluationCoverage,
    mode: Literal["segmented", "continuous"] = "segmented",
    context_tokens: int = 32768,
    output_tokens: int = 4096,
) -> list[ShadowingEvaluationInput]:
    batches: list[ShadowingEvaluationInput] = []
    pending: list[ShadowingEvaluationSegment] = []
    for segment in segments:
        if len(pending) == 20:
            batches.append(ShadowingEvaluationInput(mode=mode, segments=pending, coverage=coverage))
            pending = []
        candidate = ShadowingEvaluationInput(
            mode=mode, segments=[*pending, segment], coverage=coverage
        )
        fits = len(candidate.model_dump_json().encode()) <= 16384 and shadowing_prompt_fits(
            build_shadowing_batch_prompt(candidate),
            context_tokens=context_tokens,
            output_tokens=output_tokens,
        )
        if not fits:
            if pending:
                batches.append(
                    ShadowingEvaluationInput(mode=mode, segments=pending, coverage=coverage)
                )
            candidate = ShadowingEvaluationInput(mode=mode, segments=[segment], coverage=coverage)
            if len(candidate.model_dump_json().encode()) > 16384 or not shadowing_prompt_fits(
                build_shadowing_batch_prompt(candidate),
                context_tokens=context_tokens,
                output_tokens=output_tokens,
            ):
                raise ShadowingAiInputTooLongError(details={"segment_index": segment.segment_index})
            pending = [segment]
        else:
            pending.append(segment)
    if pending:
        batches.append(ShadowingEvaluationInput(mode=mode, segments=pending, coverage=coverage))
    return batches


def weighted_shadowing_score(
    scores: list[ShadowingSegmentScore], reference_lengths: dict[int, int]
) -> float | None:
    weight = sum(reference_lengths[item.segment_index] for item in scores)
    if not weight:
        return None
    return round(
        sum(item.score * reference_lengths[item.segment_index] for item in scores) / weight, 2
    )
