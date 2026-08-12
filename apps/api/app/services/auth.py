"""Business logic for user authentication."""

from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_refresh_token_expiry,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.exceptions.auth import (
    EmailAlreadyExistsException,
    UnauthorizedException,
)
from app.models.user import User
from app.repositories.refresh_token import (
    refresh_token_repository,
)
from app.repositories.user import (
    user_repository,
)
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
)


class AuthService:
    """Authentication business logic."""

    async def register(
        self,
        db: AsyncSession,
        data: RegisterRequest,
    ) -> User:
        email = str(data.email).strip().lower()

        existing_user = await user_repository.get_by_email(
            db,
            email,
        )

        if existing_user is not None:
            raise EmailAlreadyExistsException()

        password_hash = hash_password(data.password)

        try:
            user = await user_repository.create(
                db,
                email=email,
                password_hash=password_hash,
                display_name=data.name,
            )

            await db.commit()
            await db.refresh(user)

        except IntegrityError as exc:
            await db.rollback()
            raise EmailAlreadyExistsException() from exc

        return user

    async def login(
        self,
        db: AsyncSession,
        data: LoginRequest,
    ) -> tuple[str, str]:
        email = str(data.email).strip().lower()

        user = await user_repository.get_by_email(
            db,
            email,
        )

        if user is None:
            raise UnauthorizedException("Invalid email or password")

        if not verify_password(
            data.password,
            user.password_hash,
        ):
            raise UnauthorizedException("Invalid email or password")

        if not user.is_active:
            raise UnauthorizedException("User account is inactive")

        access_token = create_access_token(str(user.id))

        refresh_token = create_refresh_token()

        refresh_hash = hash_refresh_token(refresh_token)

        await refresh_token_repository.create(
            db,
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=get_refresh_token_expiry(),
        )

        user.last_login_at = datetime.now(UTC)

        db.add(user)
        await db.commit()

        return access_token, refresh_token

    async def refresh(
        self,
        db: AsyncSession,
        raw_refresh_token: str,
    ) -> tuple[str, str]:
        token_hash = hash_refresh_token(raw_refresh_token)

        stored_token = await refresh_token_repository.get_by_hash(
            db,
            token_hash,
            for_update=True,
        )

        if stored_token is None:
            await db.rollback()

            raise UnauthorizedException("Invalid refresh token")

        if stored_token.revoked_at is not None:
            await db.rollback()

            raise UnauthorizedException("Refresh token has been revoked")

        now = datetime.now(UTC)

        expires_at = stored_token.expires_at

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)

        if expires_at <= now:
            await db.rollback()

            raise UnauthorizedException("Refresh token has expired")

        user = await user_repository.get_by_id(
            db,
            stored_token.user_id,
        )

        if user is None:
            await db.rollback()

            raise UnauthorizedException("User not found")

        if not user.is_active:
            await db.rollback()

            raise UnauthorizedException("User account is inactive")

        # Gọi hàm revoke trực tiếp (không gán biến vì revoke() trả về None)
        await refresh_token_repository.revoke(
            db,
            stored_token,
        )

        new_refresh_token = create_refresh_token()

        new_refresh_hash = hash_refresh_token(new_refresh_token)

        await refresh_token_repository.create(
            db,
            user_id=user.id,
            token_hash=new_refresh_hash,
            expires_at=get_refresh_token_expiry(),
        )

        new_access_token = create_access_token(str(user.id))

        await db.commit()

        return (
            new_access_token,
            new_refresh_token,
        )

    async def logout(
        self,
        db: AsyncSession,
        raw_refresh_token: str | None,
    ) -> None:
        if raw_refresh_token is None:
            return

        token_hash = hash_refresh_token(raw_refresh_token)

        stored_token = await refresh_token_repository.get_by_hash(
            db,
            token_hash,
            for_update=True,
        )

        if stored_token is None:
            await db.rollback()
            return

        if stored_token.revoked_at is None:
            # Gọi hàm revoke trực tiếp
            await refresh_token_repository.revoke(
                db,
                stored_token,
            )

            await db.commit()
        else:
            await db.rollback()


auth_service = AuthService()
