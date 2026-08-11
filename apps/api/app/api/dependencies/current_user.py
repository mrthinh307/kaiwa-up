from typing import Annotated

from fastapi import Depends

from app.api.dependencies.database import DatabaseSession
from app.exceptions import UnauthorizedError
from app.models.user import User


async def get_current_user(_: DatabaseSession) -> User:
    """Resolve the authenticated user for a request.

    Placeholder until the Auth module (JWT) is implemented. Requests without an
    established identity are rejected; integration tests override this dependency
    to inject the acting user.
    """
    raise UnauthorizedError()


CurrentUser = Annotated[User, Depends(get_current_user)]
