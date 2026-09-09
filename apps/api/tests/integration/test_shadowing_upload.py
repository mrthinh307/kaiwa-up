"""Take identity and publication ordering are tested with real DB transactions."""

import asyncio
import uuid

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.attempt import Recording
from app.models.shadowing import ShadowingAttemptSegment
from app.services.storage import SavedRecordingAudio, StorageService
from tests.integration.test_shadowing_submission import prepare_submission, submission_client
from tests.unit.test_shadowing_audio import wav_audio


@pytest.fixture
def recording_storage(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    deleted: list[str] = []

    async def save(self: StorageService, **kwargs: object) -> SavedRecordingAudio:
        return SavedRecordingAudio(
            storage_key=f"test/{uuid.uuid4().hex}.wav", provider="local", asset_id=None
        )

    async def remove(self: StorageService, saved: SavedRecordingAudio) -> None:
        deleted.append(saved.storage_key)

    async def forbid_legacy_upload(self: StorageService, **kwargs: object) -> None:
        raise AssertionError(
            "Upload must use inspected audio and must not call external storage in tests"
        )

    monkeypatch.setattr(StorageService, "save_recording_audio", save)
    monkeypatch.setattr(StorageService, "delete_recording_audio", remove)
    monkeypatch.setattr(StorageService, "save_audio", forbid_legacy_upload)
    return deleted


async def test_upload_retry_reuses_the_take_and_canonicalizes_segment_id(
    shadowing_session_factory: async_sessionmaker[AsyncSession], recording_storage: list[str]
) -> None:
    example = await prepare_submission(shadowing_session_factory, recorded=0)
    take_id = str(uuid.uuid4())
    async with submission_client(shadowing_session_factory, example) as client:
        request = {
            "attempt_id": str(example.attempt.id),
            "segment_id": "01",
            "client_recording_id": take_id,
        }
        results = [
            await client.post(
                f"/api/v1/shadowing/{example.content.id}/record-segment",
                data=request,
                files={"audio_file": ("take.wav", wav_audio(1999), "audio/wav")},
            )
            for _ in range(2)
        ]
        assert all(result.status_code == 201 for result in results)
        assert results[0].json()["recording_id"] == results[1].json()["recording_id"]
        assert results[0].json()["segment_id"] == "1"
        assert results[0].json()["duration_ms"] == 1999
    async with shadowing_session_factory() as session:
        assert (
            await session.scalar(
                select(func.count())
                .select_from(Recording)
                .where(Recording.attempt_id == example.attempt.id)
            )
            == 1
        )


async def test_reusing_take_id_with_different_audio_is_a_conflict(
    shadowing_session_factory: async_sessionmaker[AsyncSession], recording_storage: list[str]
) -> None:
    example = await prepare_submission(shadowing_session_factory, recorded=0)
    async with submission_client(shadowing_session_factory, example) as client:
        form = {
            "attempt_id": str(example.attempt.id),
            "segment_id": "0",
            "client_recording_id": str(uuid.uuid4()),
        }
        first = await client.post(
            f"/api/v1/shadowing/{example.content.id}/record-segment",
            data=form,
            files={"audio_file": ("a.wav", wav_audio(2000), "audio/wav")},
        )
        assert first.status_code == 201
        second = await client.post(
            f"/api/v1/shadowing/{example.content.id}/record-segment",
            data=form,
            files={"audio_file": ("b.wav", wav_audio(3000), "audio/wav")},
        )
        assert second.status_code == 409
        assert second.json()["error"]["code"] == "shadowing_recording_idempotency_conflict"


async def test_replaying_an_old_take_does_not_replace_the_new_take(
    shadowing_session_factory: async_sessionmaker[AsyncSession], recording_storage: list[str]
) -> None:
    example = await prepare_submission(shadowing_session_factory, recorded=0)
    async with submission_client(shadowing_session_factory, example) as client:
        path = f"/api/v1/shadowing/{example.content.id}/record-segment"
        old_form = {
            "attempt_id": str(example.attempt.id),
            "segment_id": "0",
            "client_recording_id": str(uuid.uuid4()),
        }
        audio = {"audio_file": ("a.wav", wav_audio(), "audio/wav")}
        old_response = await client.post(path, data=old_form, files=audio)
        assert old_response.status_code == 201
        new_form = {
            **old_form,
            "client_recording_id": str(uuid.uuid4()),
            "expected_recording_id": old_response.json()["recording_id"],
        }
        new_response = await client.post(path, data=new_form, files=audio)
        assert new_response.status_code == 201
        replay = await client.post(path, data=old_form, files=audio)
        assert replay.status_code == 201
        assert replay.json()["recording_id"] == old_response.json()["recording_id"]
    async with shadowing_session_factory() as session:
        current = await session.scalar(
            select(ShadowingAttemptSegment).where(
                ShadowingAttemptSegment.attempt_id == example.attempt.id,
                ShadowingAttemptSegment.segment_index == 0,
            )
        )
        assert (
            current is not None and str(current.recording_id) == new_response.json()["recording_id"]
        )


async def test_upload_that_finishes_after_submit_cannot_change_submitted_recordings(
    shadowing_session_factory: async_sessionmaker[AsyncSession],
    recording_storage: list[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    example = await prepare_submission(shadowing_session_factory, recorded=1)
    entered, release = asyncio.Event(), asyncio.Event()

    async def slow_save(self: StorageService, **kwargs: object) -> SavedRecordingAudio:
        entered.set()
        await release.wait()
        return SavedRecordingAudio(
            storage_key="test/late-upload.wav", provider="local", asset_id=None
        )

    monkeypatch.setattr(StorageService, "save_recording_audio", slow_save)
    async with submission_client(shadowing_session_factory, example) as client:
        uploading = asyncio.create_task(
            client.post(
                f"/api/v1/shadowing/{example.content.id}/record-segment",
                data={
                    "attempt_id": str(example.attempt.id),
                    "segment_id": "1",
                    "client_recording_id": str(uuid.uuid4()),
                },
                files={"audio_file": ("late.wav", wav_audio(), "audio/wav")},
            )
        )
        try:
            await asyncio.wait_for(entered.wait(), timeout=15)
            submitted = await asyncio.wait_for(
                client.post(
                    f"/api/v1/shadowing/{example.content.id}/submit",
                    json={"attempt_id": str(example.attempt.id)},
                ),
                timeout=15,
            )
            assert submitted.status_code == 200
            assert submitted.json()["score"] == 50
        finally:
            release.set()
        late_response = await uploading
        assert late_response.status_code == 409
        assert late_response.json()["error"]["code"] == "shadowing_attempt_not_in_progress"
        assert recording_storage == ["test/late-upload.wav"]
