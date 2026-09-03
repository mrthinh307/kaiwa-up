"""Current-user profile endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import CurrentUser
from app.api.dependencies.database import get_db_session
from app.schemas.error import ErrorResponse
from app.schemas.user import UserResponse, UserUpdateRequest
from app.services.user import user_service, user_storage_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    operation_id="getMe",
    response_model=UserResponse,
    responses={status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse}},
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
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
    },
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


@router.put(
    "/me/avatar",
    operation_id="updateMyAvatar",
    response_model=UserResponse,
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_413_CONTENT_TOO_LARGE: {"model": ErrorResponse},
        status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
        status.HTTP_429_TOO_MANY_REQUESTS: {"model": ErrorResponse},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse},
    },
)
async def update_my_avatar(
    file: Annotated[UploadFile, File(description="A cropped 512 by 512 avatar image")],
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> UserResponse:
    """Replace the authenticated user's avatar."""
    user = await user_service.update_avatar(db, current_user, file, user_storage_service)
    return UserResponse.model_validate(user)


@router.delete(
    "/me/avatar",
    operation_id="deleteMyAvatar",
    response_model=UserResponse,
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_429_TOO_MANY_REQUESTS: {"model": ErrorResponse},
    },
)
async def delete_my_avatar(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> UserResponse:
    """Remove the authenticated user's avatar."""
    user = await user_service.delete_avatar(db, current_user, user_storage_service)
    return UserResponse.model_validate(user)
