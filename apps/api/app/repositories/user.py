"""Database access for users."""

import uuid
from datetime import timedelta
from typing import cast

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import AvatarMutationWindow, User
from app.utils.datetime_utils import utc_now


class UserRepository:
    """Repository for user persistence operations."""

    async def get_by_id(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> User | None:
        statement = select(User).where(User.id == user_id)

        return cast(User | None, await db.scalar(statement))

    async def get_by_id_for_update(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> User | None:
        statement = (
            select(User)
            .where(User.id == user_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return cast(User | None, await db.scalar(statement))

    async def get_by_email(
        self,
        db: AsyncSession,
        email: str,
    ) -> User | None:
        statement = select(User).where(User.email == email)

        return cast(User | None, await db.scalar(statement))

    async def create(
        self,
        db: AsyncSession,
        *,
        email: str,
        password_hash: str,
        display_name: str,
    ) -> User:
        user = User(
            email=email,
            password_hash=password_hash,
            display_name=display_name,
        )

        db.add(user)
        await db.flush()
        await db.refresh(user)

        return user

    async def update_display_name(
        self,
        db: AsyncSession,
        user: User,
        display_name: str,
    ) -> User:
        user.display_name = display_name

        db.add(user)
        await db.flush()
        await db.refresh(user)

        return user

    async def update_avatar(
        self,
        db: AsyncSession,
        user: User,
        *,
        avatar_url: str | None,
        storage_provider: str | None,
        storage_key: str | None,
    ) -> User:
        user.avatar_url = avatar_url
        user.avatar_storage_provider = storage_provider
        user.avatar_storage_key = storage_key
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    async def claim_avatar_mutation(self, db: AsyncSession, user_id: uuid.UUID) -> None:
        now = utc_now()
        await db.execute(
            postgres_insert(AvatarMutationWindow)
            .values(user_id=user_id, window_started_at=now, request_count=0)
            .on_conflict_do_nothing(index_elements=[AvatarMutationWindow.user_id])
        )
        window = await db.scalar(
            select(AvatarMutationWindow)
            .where(AvatarMutationWindow.user_id == user_id)
            .with_for_update()
        )
        if window is None:
            raise RuntimeError("Avatar mutation window could not be created")
        if now - window.window_started_at >= timedelta(minutes=10):
            window.window_started_at = now
            window.request_count = 1
        else:
            if window.request_count >= 10:
                from app.exceptions import AvatarRateLimitError

                raise AvatarRateLimitError(details={"retry_after_seconds": 600})
            window.request_count += 1
        await db.flush()


user_repository = UserRepository()
