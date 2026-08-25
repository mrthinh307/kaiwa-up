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
        ("あしたのかいぎのしりょうですが、", "あしたのかいぎのしりょうですが"),
        ("きょう は\u3000いい てんき。", "きょうはいいてんき"),
        ("\tじゅんびして\nおきます。", "じゅんびしておきます"),
        ("ほんとうですか？！", "ほんとうですか"),
        ("「はい」...そうです！", "はいそうです"),
        ("ええと…だいじょうぶ？", "ええとだいじょうぶ"),
    ],
)
def test_normalize_dictation_text_removes_whitespace_and_punctuation(
    text: str,
    expected: str,
) -> None:
    assert normalize_dictation_text(text) == expected


@pytest.mark.parametrize(
    ("kanji_text", "hiragana_text"),
    [
        ("明日の会議の資料ですが、", "あしたのかいぎのしりょうですが"),
        ("今日の夕方までに準備しておきます。", "きょうのゆうがたまでにじゅんびしておきます"),
    ],
)
def test_normalize_dictation_text_treats_kanji_and_hiragana_as_equivalent(
    kanji_text: str,
    hiragana_text: str,
) -> None:
    assert normalize_dictation_text(kanji_text) == normalize_dictation_text(hiragana_text)


@pytest.mark.parametrize(
    ("half_width_text", "full_width_text"),
    [
        ("6", "\uff16"),
        ("2026", "\uff12\uff10\uff12\uff16"),
        (
            "\u4f1a\u8b70\u306f6\u6642\u304b\u3089\u3067\u3059",
            "\u4f1a\u8b70\u306f\uff16\u6642\u304b\u3089\u3067\u3059",
        ),
    ],
)
def test_normalize_dictation_text_treats_half_and_full_width_digits_as_equivalent(
    half_width_text: str,
    full_width_text: str,
) -> None:
    assert normalize_dictation_text(half_width_text) == normalize_dictation_text(full_width_text)


def test_normalize_dictation_text_does_not_normalize_non_digit_width_variants() -> None:
    assert normalize_dictation_text("A") != normalize_dictation_text("Ａ")


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
