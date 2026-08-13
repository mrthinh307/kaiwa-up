import pytest

from app.services.dictation import normalize_dictation_text


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
