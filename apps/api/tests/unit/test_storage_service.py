import uuid
from io import BytesIO
from pathlib import Path

import pytest
from fastapi import UploadFile

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

    assert storage_key.startswith("recordings/")
    assert str(user_id) in storage_key
    assert str(attempt_id) in storage_key
    assert duration_seconds >= 1

    playback_url = storage.get_playback_url(storage_key)
    assert playback_url == f"/static/{storage_key}"
