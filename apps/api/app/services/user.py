"""Business logic for user operations."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.user import user_repository
from app.schemas.user import UserUpdateRequest


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


user_service = UserService()
