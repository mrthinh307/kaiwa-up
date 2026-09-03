"""Business logic for user operations."""

import asyncio
from io import BytesIO

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import AvatarInvalidError, AvatarTooLargeError, AvatarUnsupportedTypeError
from app.models.user import User
from app.repositories.user import user_repository
from app.schemas.user import UserUpdateRequest
from app.services.storage import StorageService

MAX_AVATAR_BYTES = 2 * 1024 * 1024
MAX_AVATAR_PIXELS = 25_000_000
AVATAR_SIZE = (512, 512)
SUPPORTED_AVATAR_FORMATS = {"JPEG", "PNG", "WEBP"}


class UserService:
    """User management business logic."""

    async def update_profile(
        self,
        db: AsyncSession,
        user: User,
        data: UserUpdateRequest,
    ) -> User:
        """Update user profile data."""
        updated_user = await user_repository.update_display_name(
            db,
            user,
            data.display_name,
        )

        await db.commit()
        await db.refresh(updated_user)

        return updated_user

    async def update_avatar(
        self,
        db: AsyncSession,
        user: User,
        file: UploadFile,
        storage: StorageService,
    ) -> User:
        content = await file.read(MAX_AVATAR_BYTES + 1)
        if len(content) > MAX_AVATAR_BYTES:
            raise AvatarTooLargeError()

        normalized = await asyncio.to_thread(self._normalize_avatar, content)
        await user_repository.claim_avatar_mutation(db, user.id)
        await db.commit()
        new_url, new_provider, new_key = await storage.save_avatar(
            user_id=user.id,
            content=normalized,
        )
        try:
            locked_user = await user_repository.get_by_id_for_update(db, user.id)
            if locked_user is None:
                await storage.delete_avatar(provider=new_provider, storage_key=new_key)
                raise AvatarInvalidError("User account no longer exists")
            old_provider = locked_user.avatar_storage_provider
            old_key = locked_user.avatar_storage_key
            updated_user = await user_repository.update_avatar(
                db,
                locked_user,
                avatar_url=new_url,
                storage_provider=new_provider,
                storage_key=new_key,
            )
            await db.commit()
            await db.refresh(updated_user)
        except Exception:
            await storage.delete_avatar(provider=new_provider, storage_key=new_key)
            raise

        await storage.delete_avatar(provider=old_provider, storage_key=old_key)
        return updated_user

    async def delete_avatar(
        self,
        db: AsyncSession,
        user: User,
        storage: StorageService,
    ) -> User:
        await user_repository.claim_avatar_mutation(db, user.id)
        await db.commit()
        locked_user = await user_repository.get_by_id_for_update(db, user.id)
        if locked_user is None:
            return user
        old_provider = locked_user.avatar_storage_provider
        old_key = locked_user.avatar_storage_key
        updated_user = await user_repository.update_avatar(
            db,
            locked_user,
            avatar_url=None,
            storage_provider=None,
            storage_key=None,
        )
        await db.commit()
        await db.refresh(updated_user)
        await storage.delete_avatar(provider=old_provider, storage_key=old_key)
        return updated_user

    @staticmethod
    def _normalize_avatar(content: bytes) -> bytes:
        try:
            with Image.open(BytesIO(content)) as image:
                image_format = image.format
                if image_format not in SUPPORTED_AVATAR_FORMATS:
                    raise AvatarUnsupportedTypeError()
                if image.width * image.height > MAX_AVATAR_PIXELS:
                    raise AvatarInvalidError("Avatar image dimensions are too large")
                if getattr(image, "n_frames", 1) != 1:
                    raise AvatarInvalidError("Animated avatars are not supported")
                image.verify()

            with Image.open(BytesIO(content)) as image:
                if image.size != AVATAR_SIZE:
                    raise AvatarInvalidError()
                output = BytesIO()
                image.convert("RGBA").save(output, format="WEBP", quality=85, method=6)
                normalized = output.getvalue()
        except (Image.DecompressionBombError, UnidentifiedImageError, OSError, SyntaxError) as exc:
            raise AvatarInvalidError() from exc

        if len(normalized) > MAX_AVATAR_BYTES:
            raise AvatarTooLargeError()
        return normalized


user_service = UserService()
user_storage_service = StorageService()
