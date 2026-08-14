from decimal import Decimal

import pytest

from app.services.dictation import calculate_dictation_score, normalize_dictation_text


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("明日の会議の資料ですが、", "明日の会議の資料ですが"),
        ("今日 は\u3000いい 天気。", "今日はいい天気"),
        ("\t準備して\nおきます。", "準備しておきます"),
    ],
)
def test_normalize_dictation_text_removes_whitespace_and_japanese_punctuation(
    text: str,
    expected: str,
) -> None:
    assert normalize_dictation_text(text) == expected


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
