import asyncio
import html
import re
import unicodedata
from dataclasses import dataclass
from typing import Protocol
from urllib.parse import parse_qs, urlparse

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
    YouTubeTranscriptApiException,
)

from app.exceptions import (
    InvalidYouTubeUrlError,
    TranscriptNotFoundError,
    TranscriptProviderError,
)
from app.schemas.learning_content import TranscriptSegment

_VIDEO_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{11}$")
_YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com"}
_CAPTION_CUE_PATTERN = re.compile(r"\[[^\]]*\]|【[^】]*】|\<[^>]*\>")
_FURIGANA_PATTERN = re.compile(r"（[ぁ-ゖァ-ヺー\s]+）|\([ぁ-ゖァ-ヺー\s]+\)")
_WHITESPACE_PATTERN = re.compile(r"\s+")
_UNWANTED_PUNCTUATION = {"&", "@", "#", "^", "`", "~", "|"}


@dataclass(frozen=True)
class YouTubeTranscript:
    video_id: str
    canonical_url: str
    segments: list[TranscriptSegment]


class YouTubeTranscriptProvider(Protocol):
    async def fetch_japanese(self, youtube_url: str) -> YouTubeTranscript: ...


class YouTubeCaptionProvider:
    async def fetch_japanese(self, youtube_url: str) -> YouTubeTranscript:
        video_id = self.extract_video_id(youtube_url)
        try:
            fetched = await asyncio.to_thread(
                YouTubeTranscriptApi().fetch,
                video_id,
                languages=["ja", "ja-JP"],
            )
        except (NoTranscriptFound, TranscriptsDisabled) as exc:
            raise TranscriptNotFoundError() from exc
        except VideoUnavailable as exc:
            raise InvalidYouTubeUrlError("YouTube video is unavailable") from exc
        except YouTubeTranscriptApiException as exc:
            raise TranscriptProviderError() from exc

        segments: list[TranscriptSegment] = []
        for snippet in fetched:
            script = self.clean_script(snippet.text)
            if not script:
                continue
            segments.append(
                TranscriptSegment(
                    start_time_ms=round(snippet.start * 1000),
                    end_time_ms=round((snippet.start + snippet.duration) * 1000),
                    script=script,
                )
            )
        if not segments:
            raise TranscriptNotFoundError()
        return YouTubeTranscript(
            video_id=video_id,
            canonical_url=f"https://www.youtube.com/watch?v={video_id}",
            segments=segments,
        )

    @staticmethod
    def clean_script(script: str) -> str:
        normalized = unicodedata.normalize("NFC", html.unescape(script))
        without_furigana = _FURIGANA_PATTERN.sub("", normalized)
        without_cues = _CAPTION_CUE_PATTERN.sub(" ", without_furigana)
        with_normalized_whitespace = _WHITESPACE_PATTERN.sub(" ", without_cues)
        cleaned = "".join(
            character
            for character in with_normalized_whitespace
            if unicodedata.category(character)[0] in {"L", "M", "N", "P", "Z"}
            and character not in _UNWANTED_PUNCTUATION
        )
        return _WHITESPACE_PATTERN.sub(" ", cleaned).strip()

    @staticmethod
    def extract_video_id(youtube_url: str) -> str:
        parsed = urlparse(youtube_url)
        host = (parsed.hostname or "").lower()
        if parsed.scheme not in {"http", "https"}:
            raise InvalidYouTubeUrlError()

        if host == "youtu.be":
            video_id = parsed.path.removeprefix("/").split("/", maxsplit=1)[0]
        elif host in _YOUTUBE_HOSTS:
            if parsed.path == "/watch":
                video_id = parse_qs(parsed.query).get("v", [""])[0]
            elif parsed.path.startswith(("/shorts/", "/embed/")):
                path_parts = parsed.path.split("/")
                video_id = path_parts[2] if len(path_parts) > 2 else ""
            else:
                video_id = ""
        else:
            video_id = ""

        if not _VIDEO_ID_PATTERN.fullmatch(video_id):
            raise InvalidYouTubeUrlError()
        return video_id
