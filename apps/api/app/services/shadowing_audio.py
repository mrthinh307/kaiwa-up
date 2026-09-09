"""Bounded server-side media inspection; recording time never comes from byte size."""

import asyncio
import io
import json
import math
import subprocess
import tempfile
import wave
from dataclasses import dataclass
from pathlib import Path

from app.core import settings
from app.exceptions.shadowing import (
    ShadowingAudioProcessingUnavailableError,
    ShadowingAudioTooLargeError,
    ShadowingInvalidAudioError,
)

MAX_AUDIO_BYTES = 10 * 1024 * 1024
_MAX_PROBE_OUTPUT = 4 * 1024 * 1024
_AUDIO_MIME_TYPES = {
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
}


@dataclass(frozen=True)
class ShadowingAudioMetadata:
    duration_ms: int
    mime_type: str


def _wav_duration(content: bytes) -> int:
    try:
        with wave.open(io.BytesIO(content), "rb") as audio:
            frames = audio.getnframes()
            frame_size = audio.getnchannels() * audio.getsampwidth()
            if len(audio.readframes(frames)) != frames * frame_size or audio.getframerate() <= 0:
                raise ShadowingInvalidAudioError()
            return round(frames * 1000 / audio.getframerate())
    except (wave.Error, EOFError, ValueError) as exc:
        raise ShadowingInvalidAudioError() from exc


async def _probe(path: Path, *, entries: str, output_format: str = "json") -> bytes:
    command = [
        settings.shadowing_ffprobe_path,
        "-v",
        "error",
        "-protocol_whitelist",
        "file,pipe",
        "-select_streams",
        "a:0",
        "-show_entries",
        entries,
        "-of",
        output_format,
        str(path),
    ]
    try:
        completed = await asyncio.to_thread(
            subprocess.run,
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=10,
            check=False,
        )
    except (FileNotFoundError, PermissionError) as exc:
        raise ShadowingAudioProcessingUnavailableError() from exc
    except subprocess.TimeoutExpired as exc:
        raise ShadowingInvalidAudioError("Audio inspection exceeded the processing limit") from exc
    if completed.returncode != 0:
        raise ShadowingInvalidAudioError()
    output = completed.stdout
    if not isinstance(output, bytes):
        raise ShadowingInvalidAudioError()
    if len(output) > _MAX_PROBE_OUTPUT:
        raise ShadowingInvalidAudioError("Audio metadata exceeds the processing limit")
    return output


async def _compressed_duration(content: bytes) -> int:
    with tempfile.TemporaryDirectory(prefix="kaiwa-audio-") as directory:
        path = Path(directory) / "recording"
        await asyncio.to_thread(path.write_bytes, content)
        try:
            result = json.loads(
                await _probe(path, entries="stream=codec_type,duration:format=duration")
            )
            streams = result.get("streams", [])
            if not streams or streams[0].get("codec_type") != "audio":
                raise ShadowingInvalidAudioError()
            duration = result.get("format", {}).get("duration") or streams[0].get("duration")
            if duration is not None and duration != "N/A":
                seconds = float(duration)
            else:
                # Browser MediaRecorder WebM often has no container duration. Inspect packet
                # timestamps rather than guessing from compressed byte size or trusting the client.
                packets = await _probe(
                    path, entries="packet=pts_time,duration_time", output_format="csv=p=0"
                )
                starts: list[float] = []
                ends: list[float] = []
                for line in packets.decode().splitlines():
                    values = line.split(",")
                    if len(values) >= 2 and "N/A" not in values[:2]:
                        start, packet_duration = float(values[0]), float(values[1])
                        starts.append(start)
                        ends.append(start + packet_duration)
                if not starts:
                    raise ShadowingInvalidAudioError()
                seconds = max(ends) - max(0.0, min(starts))
            if not math.isfinite(seconds) or seconds <= 0:
                raise ShadowingInvalidAudioError()
            return round(seconds * 1000)
        except (ValueError, TypeError, KeyError, IndexError, AttributeError) as exc:
            raise ShadowingInvalidAudioError() from exc


async def inspect_shadowing_audio(content: bytes, mime_type: str | None) -> ShadowingAudioMetadata:
    mime = (mime_type or "").split(";", 1)[0].strip().lower()
    if len(content) > MAX_AUDIO_BYTES:
        raise ShadowingAudioTooLargeError()
    if not content or mime not in _AUDIO_MIME_TYPES:
        raise ShadowingInvalidAudioError()
    if content.startswith(b"RIFF") and content[8:12] == b"WAVE":
        if mime not in {"audio/wav", "audio/x-wav"}:
            raise ShadowingInvalidAudioError("Audio container and MIME type do not match")
        duration_ms = await asyncio.to_thread(_wav_duration, content)
        mime = "audio/wav"
    else:
        matches_container = (
            (mime == "audio/webm" and content.startswith(b"\x1a\x45\xdf\xa3"))
            or (mime == "audio/ogg" and content.startswith(b"OggS"))
            or (mime == "audio/mp4" and content[4:8] == b"ftyp")
            or (mime == "audio/mpeg" and (content.startswith(b"ID3") or content[:1] == b"\xff"))
        )
        if not matches_container:
            raise ShadowingInvalidAudioError()
        duration_ms = await _compressed_duration(content)
    if duration_ms <= 0:
        raise ShadowingInvalidAudioError()
    return ShadowingAudioMetadata(duration_ms=duration_ms, mime_type=mime)
