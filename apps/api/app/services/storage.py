import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core import settings


class StorageService:
    def __init__(self, storage_dir: str | None = None) -> None:
        configured_dir = getattr(settings, "STORAGE_DIR", "storage")
        base_dir: str = storage_dir or str(configured_dir) or "storage"
        self.storage_dir = Path(base_dir) / "recordings"
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    async def save_audio(
        self,
        *,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
        file: UploadFile,
    ) -> tuple[str, int]:
        """Saves uploaded audio file and returns (storage_key, duration_seconds)."""
        filename = file.filename or "recording.webm"
        file_ext = Path(filename).suffix or ".webm"
        recording_id = uuid.uuid4()
        relative_key = f"{user_id}/{attempt_id}/{recording_id}{file_ext}"
        storage_key = f"recordings/{relative_key}"

        target_path = self.storage_dir / relative_key
        target_path.parent.mkdir(parents=True, exist_ok=True)

        content = await file.read()
        target_path.write_bytes(content)

        file_size = len(content)
        duration_seconds = max(1, file_size // 16000)

        return storage_key, duration_seconds

    def get_playback_url(self, storage_key: str) -> str:
        """Returns playback URL for a stored recording."""
        return f"/static/{storage_key}"
