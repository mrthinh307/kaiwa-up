"""Regression coverage for transcript comparison, independent of completion/EXP."""

import pytest

from app.schemas.shadowing import ShadowingWordStatus
from app.services.shadowing_comparison import compare_shadowing_segment


@pytest.mark.parametrize(
    ("reference", "learner"),
    [
        ("こんにちは。", "こんにちは"),
        ("「はい、わかりました！」", "はいわかりました"),
        ("学校", "がっこう"),
        ("パン", "ﾊﾟﾝ"),
        ("が", "か\u3099"),
        ("１２３", "123"),
    ],
)
def test_equivalent_readings_match_without_losing_raw_text(reference: str, learner: str) -> None:
    result = compare_shadowing_segment(reference, learner)

    assert result.score == 100.0
    assert result.version == 2
    assert result.words
    assert all(word.status == ShadowingWordStatus.CORRECT for word in result.words)
    for word in result.words:
        assert word.reference_start is not None and word.reference_end is not None
        assert reference[word.reference_start : word.reference_end] == word.word
        assert word.learner_start is not None and word.learner_end is not None
        assert learner[word.learner_start : word.learner_end] == word.user_word


@pytest.mark.parametrize("learner", ["こんにちはさようなら", "さようならこんにちは"])
def test_added_speech_reduces_score_and_exposes_the_actual_extra_text(learner: str) -> None:
    result = compare_shadowing_segment("こんにちは", learner)

    assert result.score == 50.0
    assert [span.text for span in result.extra_spans] == ["さようなら"]
    span = result.extra_spans[0]
    assert learner[span.start : span.end] == "さようなら"


def test_partial_token_match_is_not_marked_correct() -> None:
    result = compare_shadowing_segment("こんにちは", "こんにちわ")

    assert result.score == 80.0
    assert result.words[0].status == ShadowingWordStatus.INCORRECT
    assert result.words[0].user_word == "こんにちわ"


@pytest.mark.parametrize(("reference", "learner"), [("学校", "がこう"), ("コーヒー", "コヒ")])
def test_missing_small_tsu_or_long_vowels_reduces_score(reference: str, learner: str) -> None:
    result = compare_shadowing_segment(reference, learner)

    assert result.score is not None and result.score < 100
    assert any(word.status != ShadowingWordStatus.CORRECT for word in result.words)


@pytest.mark.parametrize("reference", ["", "。！？", " \n\t"])
def test_reference_without_evaluable_text_has_no_score(reference: str) -> None:
    result = compare_shadowing_segment(reference, "こんにちは")

    assert result.score is None
    assert result.words == []
    assert result.reference_length == 0


def test_empty_recognized_speech_marks_reference_missing() -> None:
    result = compare_shadowing_segment("こんにちは。", "")

    assert result.score == 0
    assert result.words[0].status == ShadowingWordStatus.MISSING
    assert result.words[0].user_word is None
    assert result.words[0].learner_start is None


def test_long_repeated_reading_remains_aligned_after_an_extra_character() -> None:
    result = compare_shadowing_segment("かきくけこ" * 50, "あ" + "かきくけこ" * 50)

    assert result.score == 99.6
    assert [span.text for span in result.extra_spans] == ["あ"]


def test_extra_span_offsets_refer_to_raw_half_width_and_combining_characters() -> None:
    learner = "「ﾊﾟﾝ」か\u3099"
    result = compare_shadowing_segment("パン", learner)

    assert result.score is not None and result.score < 100
    assert [span.text for span in result.extra_spans] == ["か\u3099"]
    assert learner[result.extra_spans[0].start : result.extra_spans[0].end] == "か\u3099"


def test_compatibility_expansion_keeps_a_valid_source_span() -> None:
    result = compare_shadowing_segment("メートル", "㍍")

    assert result.score == 100
    assert result.words[0].user_word == "㍍"
    assert result.words[0].learner_start == 0
    assert result.words[0].learner_end == 1
