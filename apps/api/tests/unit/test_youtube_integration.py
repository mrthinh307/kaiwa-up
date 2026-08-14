import pytest

from app.exceptions import InvalidYouTubeUrlError
from app.integrations.youtube import YouTubeCaptionProvider


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
    ],
)
def test_extract_video_id_accepts_supported_youtube_urls(url: str, expected: str) -> None:
    assert YouTubeCaptionProvider.extract_video_id(url) == expected


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/watch?v=dQw4w9WgXcQ",
        "https://www.youtube.com/watch?v=too-short",
        "javascript:alert(1)",
    ],
)
def test_extract_video_id_rejects_untrusted_or_invalid_urls(url: str) -> None:
    with pytest.raises(InvalidYouTubeUrlError):
        YouTubeCaptionProvider.extract_video_id(url)


@pytest.mark.parametrize(
    ("script", "expected"),
    [
        ("🎵 こんにちは！ 👋", "こんにちは！"),
        ("[音楽] 今日は  晴れです。 【拍手】", "今日は 晴れです。"),
        ("<i>日本語</i> &amp; English\ntext", "日本語 English text"),
        ("カフェ\u200bで勉強する。", "カフェで勉強する。"),
        ("１２３、ABC・日本語！？", "１２３、ABC・日本語！？"),
        (
            "本当にこの悩み、壁（かべ）に当たっていてかなり苦しいんですけど",
            "本当にこの悩み、壁に当たっていてかなり苦しいんですけど",
        ),
        ("日本語(にほんご)を勉強します。", "日本語を勉強します。"),
        ("今日は（雨なので）家にいます。", "今日は（雨なので）家にいます。"),
        ("[音楽] 🎶", ""),
    ],
)
def test_clean_script_removes_icons_cues_and_unwanted_characters(
    script: str,
    expected: str,
) -> None:
    assert YouTubeCaptionProvider.clean_script(script) == expected
