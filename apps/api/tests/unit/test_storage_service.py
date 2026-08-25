import uuid
from io import BytesIO
from pathlib import Path

import pytest
from fastapi import UploadFile

from app.core import settings
from app.exceptions import StorageUnavailableError
from app.services.storage import StorageService


@pytest.mark.asyncio
async def test_storage_service_save_audio_and_playback_url(tmp_path: Path):
    storage = StorageService(storage_dir=str(tmp_path))
    user_id = uuid.uuid4()
    attempt_id = uuid.uuid4()

    dummy_content = b"header_data_sample_audio_recording_content"
    upload_file = UploadFile(
        filename="test_sample.webm",
        file=BytesIO(dummy_content),
        headers={"content-type": "audio/webm"},
    )

    storage_key, duration_seconds = await storage.save_audio(
        user_id=user_id,
        attempt_id=attempt_id,
        file=upload_file,
    )

    assert (
        storage_key.startswith("recordings/")
        or storage_key.startswith("http://")
        or storage_key.startswith("https://")
    )
    assert duration_seconds >= 1

    playback_url = storage.get_playback_url(storage_key)
    assert (
        playback_url.startswith("/static/recordings/")
        or playback_url.startswith("http://")
        or playback_url.startswith("https://")
    )


@pytest.mark.asyncio
async def test_storage_service_does_not_fall_back_to_local_files_in_production(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "CLOUDINARY_URL", None)
    monkeypatch.setattr(settings, "CLOUDINARY_CLOUD_NAME", None)
    monkeypatch.setattr(settings, "CLOUDINARY_API_KEY", None)
    monkeypatch.setattr(settings, "CLOUDINARY_API_SECRET", None)

    storage = StorageService(storage_dir=str(tmp_path))
    upload_file = UploadFile(filename="recording.webm", file=BytesIO(b"audio"))

    with pytest.raises(StorageUnavailableError):
        await storage.save_audio(
            user_id=uuid.uuid4(),
            attempt_id=uuid.uuid4(),
            file=upload_file,
        )

    assert not (tmp_path / "recordings").exists()
