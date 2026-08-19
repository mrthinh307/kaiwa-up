from decimal import Decimal

import pytest

from app.services.dictation import (
    calculate_dictation_exp,
    calculate_dictation_score,
    normalize_dictation_text,
)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("明日の会議の資料ですが、", "明日の会議の資料ですが"),
        ("今日 は\u3000いい 天気。", "今日はいい天気"),
        ("\t準備して\nおきます。", "準備しておきます"),
        ("本当ですか？！", "本当ですか"),
        ("「はい」...そうです！", "はいそうです"),
        ("ええと…大丈夫？", "ええと大丈夫"),
    ],
)
def test_normalize_dictation_text_removes_whitespace_and_punctuation(
    text: str,
    expected: str,
) -> None:
    assert normalize_dictation_text(text) == expected


@pytest.mark.parametrize(
    ("answered_count", "total_count", "expected"),
    [
        (0, 100, 0),
        (1, 100, 5),
        (4, 100, 5),
        (5, 100, 15),
        (24, 100, 15),
        (25, 100, 25),
        (49, 100, 25),
        (50, 100, 40),
        (74, 100, 40),
        (75, 100, 50),
        (100, 100, 50),
    ],
)
def test_calculate_dictation_exp_uses_completion_percentage_tiers(
    answered_count: int,
    total_count: int,
    expected: int,
) -> None:
    assert (
        calculate_dictation_exp(answered_count=answered_count, total_count=total_count) == expected
    )


@pytest.mark.parametrize(
    ("correct_count", "total_count", "expected"),
    [
        (0, 3, Decimal("0.00")),
        (1, 3, Decimal("33.33")),
        (2, 3, Decimal("66.67")),
        (3, 3, Decimal("100.00")),
    ],
)
def test_calculate_dictation_score_uses_all_segments_and_rounds_half_up(
    correct_count: int,
    total_count: int,
    expected: Decimal,
) -> None:
    assert (
        calculate_dictation_score(
            correct_count=correct_count,
            total_count=total_count,
        )
        == expected
    )
