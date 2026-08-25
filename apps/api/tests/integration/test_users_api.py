from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import httpx
import jwt
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import settings
from app.core.security import create_access_token
from app.models.user import User

PROFILE_PATH = "/api/v1/users/me"


async def create_user(session: AsyncSession, *, email: str, display_name: str) -> User:
    user = User(email=email, password_hash="password-hash", display_name=display_name)
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_me_requires_valid_access_token(client: httpx.AsyncClient) -> None:
    missing_response = await client.get(PROFILE_PATH)
    malformed_response = await client.get(PROFILE_PATH, headers=bearer("not-a-token"))
    expired_token = jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000000",
            "type": "access",
            "exp": datetime.now(UTC) - timedelta(seconds=1),
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    expired_response = await client.get(PROFILE_PATH, headers=bearer(expired_token))

    assert missing_response.status_code == 401
    assert malformed_response.status_code == 401
    assert expired_response.status_code == 401
    assert missing_response.json()["error"]["code"] == "unauthorized"


@pytest.mark.asyncio
async def test_get_me_returns_only_current_user(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_email: Callable[[str], str],
) -> None:
    current_email = unique_email("current-user")
    current_user = await create_user(
        db_session,
        email=current_email,
        display_name="Current User",
    )
    await create_user(
        db_session,
        email=unique_email("other-user"),
        display_name="Other User",
    )

    response = await client.get(
        PROFILE_PATH,
        headers=bearer(create_access_token(str(current_user.id))),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == str(current_user.id)
    assert payload["email"] == current_email
    assert payload["display_name"] == "Current User"
    assert payload["created_at"]
    assert "password_hash" not in payload


@pytest.mark.asyncio
async def test_update_me_trims_display_name(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_email: Callable[[str], str],
) -> None:
    user = await create_user(
        db_session,
        email=unique_email("update-user"),
        display_name="Before",
    )
    headers = bearer(create_access_token(str(user.id)))

    response = await client.patch(
        PROFILE_PATH,
        headers=headers,
        json={"display_name": "  After  "},
    )

    assert response.status_code == 200
    assert response.json()["display_name"] == "After"
    await db_session.refresh(user)
    assert user.display_name == "After"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"display_name": " "},
        {"display_name": "x" * 256},
        {"display_name": "Allowed", "email": "changed@example.com"},
        {"role": "admin"},
    ],
)
async def test_update_me_rejects_invalid_or_extra_fields(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    payload: dict[str, str],
    unique_email: Callable[[str], str],
) -> None:
    user = await create_user(
        db_session,
        email=unique_email("invalid-update-user"),
        display_name="Before",
    )

    response = await client.patch(
        PROFILE_PATH,
        headers=bearer(create_access_token(str(user.id))),
        json=payload,
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
