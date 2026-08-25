"""Database access for users."""

import uuid
from typing import cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    """Repository for user persistence operations."""

    async def get_by_id(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> User | None:
        statement = select(User).where(User.id == user_id)

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


user_repository = UserRepository()
