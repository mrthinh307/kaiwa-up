import pytest

from app.exceptions.ai import AiInvalidResponseError
from app.exceptions.shadowing import ShadowingAiInputTooLongError
from app.integrations.ai.shadowing_contracts import (
    ShadowingEvaluationCoverage,
    ShadowingEvaluationInput,
    ShadowingEvaluationResult,
    ShadowingEvaluationSegment,
    ShadowingIndexedCorrection,
    ShadowingSegmentScore,
    ShadowingSummaryInput,
    ShadowingSummaryResult,
    validate_shadowing_evaluation,
    validate_shadowing_summary,
)
from app.services.shadowing_feedback import build_shadowing_batches, weighted_shadowing_score


def test_200_sentences_remain_separately_identified_in_ten_batches() -> None:
    segments = [
        ShadowingEvaluationSegment(
            segment_index=index, reference="こんにちは", learner="こんにちは", reference_length=5
        )
        for index in range(200)
    ]
    batches = build_shadowing_batches(
        segments, coverage=ShadowingEvaluationCoverage(total=200, recorded=200, completed=200)
    )
    assert len(batches) == 10
    assert [segment.segment_index for batch in batches for segment in batch.segments] == list(
        range(200)
    )
    assert all(len(batch.segments) == 20 for batch in batches)


def test_batch_byte_limit_is_applied_before_provider_calls() -> None:
    segments = [
        ShadowingEvaluationSegment(
            segment_index=index, reference="あ" * 1000, learner="あ" * 1000, reference_length=1000
        )
        for index in range(5)
    ]
    batches = build_shadowing_batches(
        segments, coverage=ShadowingEvaluationCoverage(total=5, recorded=5, completed=5)
    )
    assert len(batches) == 3
    assert all(len(batch.model_dump_json().encode()) <= 16384 for batch in batches)


def test_one_oversized_sentence_is_rejected_without_silent_truncation() -> None:
    segment = ShadowingEvaluationSegment(
        segment_index=7, reference="あ" * 6000, learner="あ" * 6000, reference_length=6000
    )
    with pytest.raises(ShadowingAiInputTooLongError):
        build_shadowing_batches(
            [segment], coverage=ShadowingEvaluationCoverage(total=1, recorded=1, completed=1)
        )


def test_overall_score_is_weighted_by_reference_length_not_by_batch_count() -> None:
    scores = [
        ShadowingSegmentScore(segment_index=0, score=100),
        ShadowingSegmentScore(segment_index=1, score=0),
    ]
    assert weighted_shadowing_score(scores, {0: 5, 1: 15}) == 25
    assert weighted_shadowing_score([], {}) is None


def test_cross_segment_correction_is_rejected() -> None:
    payload = ShadowingEvaluationInput(
        segments=[
            ShadowingEvaluationSegment(
                segment_index=0, reference="こんにちは", learner="こんにちは", reference_length=5
            ),
            ShadowingEvaluationSegment(
                segment_index=4, reference="ありがとう", learner="ありがと", reference_length=5
            ),
        ]
    )
    result = ShadowingEvaluationResult(
        segments=[
            ShadowingSegmentScore(segment_index=0, score=100),
            ShadowingSegmentScore(segment_index=4, score=80),
        ],
        feedback="Review",
        corrections=[
            ShadowingIndexedCorrection(
                segment_index=0, original="ありがと", corrected="ありがとう", reason="Wrong segment"
            )
        ],
    )
    with pytest.raises(AiInvalidResponseError):
        validate_shadowing_evaluation(payload, result)


@pytest.mark.parametrize("ids", [[0, 0], [0, 2], []])
def test_missing_duplicate_or_unknown_segment_scores_are_rejected(ids: list[int]) -> None:
    payload = ShadowingEvaluationInput(
        segments=[
            ShadowingEvaluationSegment(
                segment_index=0, reference="あ", learner="あ", reference_length=1
            )
        ]
    )
    result = ShadowingEvaluationResult(
        segments=[ShadowingSegmentScore(segment_index=index, score=80) for index in ids],
        feedback="Review",
    )
    with pytest.raises(AiInvalidResponseError):
        validate_shadowing_evaluation(payload, result)


def test_summary_cannot_invent_new_correction_evidence() -> None:
    payload = ShadowingSummaryInput(
        overall_score=50,
        evaluated_segments=1,
        corrections=[
            ShadowingIndexedCorrection(
                segment_index=0, original="あ", corrected="い", reason="Example"
            )
        ],
    )
    result = ShadowingSummaryResult(feedback="Review", correction_indices=[1])
    with pytest.raises(AiInvalidResponseError):
        validate_shadowing_summary(payload, result)
