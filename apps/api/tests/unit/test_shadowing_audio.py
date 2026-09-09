import io
import subprocess
import wave
from pathlib import Path

import pytest

from app.exceptions.shadowing import ShadowingInvalidAudioError
from app.services.shadowing_audio import _probe, inspect_shadowing_audio


def wav_audio(duration_ms: int = 2000) -> bytes:
    output = io.BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(b"\x00\x00" * (16 * duration_ms))
    return output.getvalue()


@pytest.mark.parametrize("duration_ms", [1, 1999, 2000, 2999])
async def test_audio_duration_uses_decoded_frame_count_in_milliseconds(duration_ms: int) -> None:
    metadata = await inspect_shadowing_audio(wav_audio(duration_ms), "audio/wav")
    assert metadata.duration_ms == duration_ms
    assert metadata.mime_type == "audio/wav"


@pytest.mark.parametrize(
    "content", [b"", b"not an audio file", b"0" * 40000], ids=["empty", "text", "fake-long"]
)
async def test_non_audio_bytes_are_not_scored_as_duration(content: bytes) -> None:
    with pytest.raises(ShadowingInvalidAudioError):
        await inspect_shadowing_audio(content, "audio/webm")


async def test_truncated_wav_cannot_claim_more_recording_time_than_it_contains() -> None:
    with pytest.raises(ShadowingInvalidAudioError):
        await inspect_shadowing_audio(wav_audio()[:100], "audio/wav")


async def test_non_audio_mime_type_is_rejected() -> None:
    with pytest.raises(ShadowingInvalidAudioError):
        await inspect_shadowing_audio(wav_audio(), "text/plain")


async def test_ffprobe_runs_in_a_thread_compatible_with_windows_event_loops(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[list[str]] = []

    def fake_run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[bytes]:
        calls.append(command)
        assert kwargs["timeout"] == 10
        assert kwargs["check"] is False
        return subprocess.CompletedProcess(command, 0, stdout=b'{"format": {"duration": "2"}}')

    monkeypatch.setattr(subprocess, "run", fake_run)

    output = await _probe(Path("recording.webm"), entries="format=duration")

    assert output == b'{"format": {"duration": "2"}}'
    assert calls and calls[0][0].endswith("ffprobe")
