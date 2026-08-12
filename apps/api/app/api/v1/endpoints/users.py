"""Current-user profile endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import CurrentUser
from app.api.dependencies.database import get_db_session
from app.schemas.user import UserResponse, UserUpdateRequest
from app.services.user import user_service

router = APIRouter(tags=["Users"])


@router.get(
    "/me",
    operation_id="getMe",
    response_model=UserResponse,
)
async def get_me(
    current_user: CurrentUser,
) -> UserResponse:
    """Return the authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.patch(
    "/me",
    operation_id="updateMe",
    response_model=UserResponse,
)
async def update_me(
    data: UserUpdateRequest,
    current_user: CurrentUser,
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
) -> UserResponse:
    """Update the authenticated user's display name."""
    user = await user_service.update_profile(
        db,
        current_user,
        data,
    )

    return UserResponse.model_validate(user)
