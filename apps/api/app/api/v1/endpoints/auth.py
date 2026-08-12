"""Authentication API endpoints."""

from typing import Annotated

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    Response,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.database import get_db_session
from app.core.config import settings
from app.exceptions.auth import (
    UnauthorizedException,
)
from app.schemas.auth import (
    AccessTokenResponse,
    LoginRequest,
    RegisterRequest,
)
from app.schemas.user import UserResponse
from app.services.auth import (
    auth_service,
)

router = APIRouter(tags=["Auth"])


def set_refresh_cookie(
    response: Response,
    refresh_token: str,
) -> None:
    """Store the refresh token in an HttpOnly cookie."""
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60

    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        max_age=max_age,
        path="/api/v1/auth",
    )


def delete_refresh_cookie(
    response: Response,
) -> None:
    """Remove the refresh-token cookie."""
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        path="/api/v1/auth",
        secure=settings.REFRESH_COOKIE_SECURE,
        httponly=True,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    data: RegisterRequest,
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
) -> UserResponse:
    """Register a new user."""
    user = await auth_service.register(
        db,
        data,
    )

    return UserResponse.model_validate(user)


@router.post(
    "/login",
    response_model=AccessTokenResponse,
)
async def login(
    data: LoginRequest,
    response: Response,
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
) -> AccessTokenResponse:
    """Authenticate with email/password."""
    (
        access_token,
        refresh_token,
    ) = await auth_service.login(
        db,
        data,
    )

    set_refresh_cookie(
        response,
        refresh_token,
    )

    return AccessTokenResponse(
        access_token=access_token,
        expires_in=(settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60),
    )


@router.post(
    "/refresh",
    response_model=AccessTokenResponse,
)
async def refresh(
    response: Response,
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    refresh_token: Annotated[
        str | None,
        Cookie(alias=settings.REFRESH_COOKIE_NAME),
    ] = None,
) -> AccessTokenResponse:
    """Rotate the refresh token and issue a new access token."""
    if refresh_token is None:
        raise UnauthorizedException("Refresh token is required")

    (
        new_access_token,
        new_refresh_token,
    ) = await auth_service.refresh(
        db,
        refresh_token,
    )

    set_refresh_cookie(
        response,
        new_refresh_token,
    )

    return AccessTokenResponse(
        access_token=new_access_token,
        expires_in=(settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60),
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def logout(
    response: Response,
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    refresh_token: Annotated[
        str | None,
        Cookie(alias=settings.REFRESH_COOKIE_NAME),
    ] = None,
) -> Response:
    """Revoke the current refresh token and clear its cookie."""
    await auth_service.logout(
        db,
        refresh_token,
    )

    delete_refresh_cookie(response)

    response.status_code = status.HTTP_204_NO_CONTENT

    return response
