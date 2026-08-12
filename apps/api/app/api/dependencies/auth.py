"""Authentication dependencies."""

import uuid
from typing import Annotated

import jwt
from fastapi import Depends
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.database import (
    get_db_session,
)
from app.core.security import (
    decode_access_token,
)
from app.exceptions.auth import (
    UnauthorizedException,
)
from app.models.user import User
from app.repositories.user import (
    user_repository,
)

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
) -> User:
    """Resolve the authenticated user from the access JWT."""
    if credentials is None:
        raise UnauthorizedException("Authentication required")

    token = credentials.credentials

    try:
        payload = decode_access_token(token)
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedException("Invalid access token") from exc

    subject = payload.get("sub")

    if not isinstance(subject, str):
        raise UnauthorizedException("Invalid access token")

    try:
        user_id = uuid.UUID(subject)
    except ValueError as exc:
        raise UnauthorizedException("Invalid access token") from exc

    user = await user_repository.get_by_id(
        db,
        user_id,
    )

    if user is None:
        raise UnauthorizedException("Unauthorized")

    if not user.is_active:
        raise UnauthorizedException("User account is inactive")

    return user


CurrentUser = Annotated[
    User,
    Depends(get_current_user),
]
