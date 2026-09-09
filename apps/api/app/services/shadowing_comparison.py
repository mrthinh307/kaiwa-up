"""Versioned, text-only reading comparison. Legacy scores remain in shadowing.py."""

import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher

import pykakasi

from app.schemas.shadowing import (
    ShadowingComparison,
    ShadowingTextSpan,
    ShadowingWordFeedback,
    ShadowingWordStatus,
)

_KAKASI = pykakasi.kakasi()  # type: ignore[no-untyped-call]
_IGNORED_SYMBOLS = frozenset("〜~")
type Offset = tuple[int, int]


@dataclass(frozen=True)
class _Token:
    source_start: int
    source_end: int
    reading_start: int
    reading_end: int


@dataclass(frozen=True)
class _Reading:
    text: str
    offsets: list[Offset]
    tokens: list[_Token]


def _normalize_with_offsets(source: str) -> tuple[str, list[Offset]]:
    """Keep raw offsets through compatibility expansion and voiced-mark composition."""
    clusters: list[tuple[str, int, int]] = []
    for index, character in enumerate(source):
        if clusters and (unicodedata.combining(character) or character in "\uff9e\uff9f"):
            cluster, start, _ = clusters[-1]
            clusters[-1] = (cluster + character, start, index + 1)
        else:
            clusters.append((character, index, index + 1))

    characters: list[str] = []
    offsets: list[Offset] = []
    for cluster, start, end in clusters:
        for character in unicodedata.normalize("NFKC", cluster):
            if (
                character.isspace()
                or unicodedata.category(character).startswith("P")
                or character in _IGNORED_SYMBOLS
            ):
                continue
            characters.append(character)
            offsets.append((start, end))
    return "".join(characters), offsets


def _hiragana(character: str) -> str:
    codepoint = ord(character)
    return chr(codepoint - 0x60) if 0x30A1 <= codepoint <= 0x30F6 else character


def _reading_offsets(original: str, reading: str, source_offsets: list[Offset]) -> list[Offset]:
    # Kana is mapped character-for-character. A kanji reading that cannot be split reliably
    # points to the complete corresponding source span rather than inventing raw offsets.
    kana_original = "".join(_hiragana(character) for character in original)
    matcher = SequenceMatcher(None, kana_original, reading, autojunk=False)
    offsets: list[Offset] = []
    for tag, source_start, source_end, target_start, target_end in matcher.get_opcodes():
        if tag == "equal":
            offsets.extend(source_offsets[source_start:source_end])
        elif tag in ("replace", "insert"):
            if source_start < source_end:
                bounds = (source_offsets[source_start][0], source_offsets[source_end - 1][1])
            else:
                bounds = source_offsets[min(source_start, len(source_offsets) - 1)]
            offsets.extend([bounds] * (target_end - target_start))
    return offsets


def _read(source: str) -> _Reading:
    normalized, source_offsets = _normalize_with_offsets(source)
    if not normalized:
        return _Reading("", [], [])
    readings: list[str] = []
    offsets: list[Offset] = []
    tokens: list[_Token] = []
    source_index = 0
    reading_index = 0
    for item in _KAKASI.convert(normalized):
        original, reading = item["orig"], item["hira"]
        token_offsets = source_offsets[source_index : source_index + len(original)]
        source_index += len(original)
        if not token_offsets or not reading:
            continue
        readings.append(reading)
        offsets.extend(_reading_offsets(original, reading, token_offsets))
        tokens.append(
            _Token(
                token_offsets[0][0],
                token_offsets[-1][1],
                reading_index,
                reading_index + len(reading),
            )
        )
        reading_index += len(reading)
    return _Reading("".join(readings), offsets, tokens)


def compare_shadowing_segment(reference: str, learner: str) -> ShadowingComparison:
    """Compare recognized readings, including extra speech; never infer audio quality."""
    reference_reading, learner_reading = _read(reference), _read(learner)
    reference_length = len(reference_reading.text)
    if reference_length == 0:
        return ShadowingComparison(reference_length=0)

    matcher = SequenceMatcher(None, reference_reading.text, learner_reading.text, autojunk=False)
    opcodes = matcher.get_opcodes()
    matched = sum(block.size for block in matcher.get_matching_blocks())
    score = round(100 * matched / max(reference_length, len(learner_reading.text)), 2)
    words: list[ShadowingWordFeedback] = []
    extra_spans: list[ShadowingTextSpan] = []

    for tag, _, _, learner_start, learner_end in opcodes:
        if tag == "insert":
            start = learner_reading.offsets[learner_start][0]
            end = learner_reading.offsets[learner_end - 1][1]
            extra_spans.append(ShadowingTextSpan(start=start, end=end, text=learner[start:end]))

    for token in reference_reading.tokens:
        matched_characters = 0
        learner_offsets: list[Offset] = []
        for tag, ref_start, ref_end, learner_start, learner_end in opcodes:
            overlap_start = max(token.reading_start, ref_start)
            overlap_end = min(token.reading_end, ref_end)
            if overlap_start >= overlap_end:
                continue
            if tag == "equal":
                matched_characters += overlap_end - overlap_start
                start = learner_start + overlap_start - ref_start
                end = start + overlap_end - overlap_start
                learner_offsets.extend(learner_reading.offsets[start:end])
            elif tag == "replace":
                learner_offsets.extend(learner_reading.offsets[learner_start:learner_end])

        is_correct = matched_characters == token.reading_end - token.reading_start
        status = (
            ShadowingWordStatus.CORRECT
            if is_correct
            else ShadowingWordStatus.INCORRECT
            if learner_offsets
            else ShadowingWordStatus.MISSING
        )
        raw_start = min(offset[0] for offset in learner_offsets) if learner_offsets else None
        raw_end = max(offset[1] for offset in learner_offsets) if learner_offsets else None
        words.append(
            ShadowingWordFeedback(
                word=reference[token.source_start : token.source_end],
                status=status,
                user_word=learner[raw_start:raw_end] if raw_start is not None else None,
                reference_start=token.source_start,
                reference_end=token.source_end,
                learner_start=raw_start,
                learner_end=raw_end,
            )
        )

    return ShadowingComparison(
        score=score, reference_length=reference_length, words=words, extra_spans=extra_spans
    )
