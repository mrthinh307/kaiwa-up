import logging
import uuid
from pathlib import Path

import cloudinary
import cloudinary.uploader
from fastapi import UploadFile

from app.core import settings

logger = logging.getLogger(__name__)


class StorageService:
    def __init__(self, storage_dir: str | None = None) -> None:
        configured_dir = getattr(settings, "STORAGE_DIR", "storage")
        base_dir: str = storage_dir or str(configured_dir) or "storage"
        self.storage_dir = Path(base_dir) / "recordings"
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        self._has_cloudinary = False
        if settings.CLOUDINARY_URL:
            import os

            os.environ["CLOUDINARY_URL"] = settings.CLOUDINARY_URL
            cloudinary.reset_config()
            cfg = cloudinary.config()
            if cfg.cloud_name and cfg.api_key:
                self._has_cloudinary = True
        elif (
            settings.CLOUDINARY_CLOUD_NAME
            and settings.CLOUDINARY_API_KEY
            and settings.CLOUDINARY_API_SECRET
        ):
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True,
            )
            self._has_cloudinary = True

    async def save_audio(
        self,
        *,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
        file: UploadFile,
    ) -> tuple[str, int]:
        """Saves uploaded audio to Cloudinary or local storage and returns (key, duration_s)."""
        content = await file.read()
        await file.seek(0)
        file_size = len(content)

        if self._has_cloudinary:
            try:
                import io

                recording_id = uuid.uuid4()
                public_id = f"{recording_id}"
                folder_prefix = getattr(settings, "CLOUDINARY_FOLDER", "kaiwa-up") or "kaiwa-up"
                folder = f"{folder_prefix}/shadowing_user_recordings/{user_id}/{attempt_id}"

                result = cloudinary.uploader.upload(
                    io.BytesIO(content),
                    resource_type="auto",
                    folder=folder,
                    public_id=public_id,
                    overwrite=True,
                )
                secure_url = result.get("secure_url") or result.get("url")
                raw_duration = result.get("duration")
                duration_seconds = int(raw_duration) if raw_duration else max(1, file_size // 16000)

                if secure_url:
                    return str(secure_url), duration_seconds
            except Exception as exc:
                logger.warning("Cloudinary upload failed, falling back to local storage: %s", exc)

        filename = file.filename or "recording.webm"
        file_ext = Path(filename).suffix or ".webm"
        recording_id = uuid.uuid4()
        relative_key = f"{user_id}/{attempt_id}/{recording_id}{file_ext}"
        storage_key = f"recordings/{relative_key}"

        target_path = self.storage_dir / relative_key
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(content)

        duration_seconds = max(1, file_size // 16000)
        return storage_key, duration_seconds

    def get_playback_url(self, storage_key: str) -> str:
        """Returns playback URL for a stored recording."""
        if storage_key.startswith("http://") or storage_key.startswith("https://"):
            return storage_key
        return f"/static/{storage_key}"
