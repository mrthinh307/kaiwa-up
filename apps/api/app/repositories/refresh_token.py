"""Database access for authentication refresh tokens."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import AuthRefreshToken


class RefreshTokenRepository:
    """Repository for refresh-token persistence operations."""

    async def create(
        self,
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        token_hash: str,
        expires_at: datetime,
    ) -> AuthRefreshToken:
        token = AuthRefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )

        db.add(token)
        await db.flush()

        return token

    async def get_by_hash(
        self,
        db: AsyncSession,
        token_hash: str,
        *,
        for_update: bool = False,
    ) -> AuthRefreshToken | None:
        statement = select(AuthRefreshToken).where(AuthRefreshToken.token_hash == token_hash)

        if for_update:
            statement = statement.with_for_update()

        return await db.scalar(statement)

    async def revoke(
        self,
        db: AsyncSession,
        token: AuthRefreshToken,
    ) -> None:
        if token.revoked_at is not None:
            return

        token.revoked_at = datetime.now(UTC)

        db.add(token)
        await db.flush()


refresh_token_repository = RefreshTokenRepository()
