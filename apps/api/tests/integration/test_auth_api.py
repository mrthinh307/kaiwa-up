from datetime import UTC, datetime, timedelta

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import settings
from app.core.security import hash_password, hash_refresh_token
from app.models.user import AuthRefreshToken, User

REGISTER_PATH = "/api/v1/auth/register"
LOGIN_PATH = "/api/v1/auth/login"
REFRESH_PATH = "/api/v1/auth/refresh"
LOGOUT_PATH = "/api/v1/auth/logout"


async def register_user(client: httpx.AsyncClient) -> httpx.Response:
    return await client.post(
        REGISTER_PATH,
        json={
            "email": "  Learner@Example.com ",
            "name": "  Kaiwa Learner  ",
            "password": "secure-password",
        },
    )


async def login_user(client: httpx.AsyncClient) -> httpx.Response:
    return await client.post(
        LOGIN_PATH,
        json={"email": "learner@example.com", "password": "secure-password"},
    )


@pytest.mark.asyncio
async def test_register_normalizes_user_and_filters_sensitive_fields(
    client: httpx.AsyncClient,
) -> None:
    response = await register_user(client)

    assert response.status_code == 201
    payload = response.json()
    assert payload["email"] == "learner@example.com"
    assert payload["display_name"] == "Kaiwa Learner"
    assert payload["created_at"]
    assert "password" not in payload
    assert "password_hash" not in payload


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_conflict_envelope(
    client: httpx.AsyncClient,
) -> None:
    assert (await register_user(client)).status_code == 201

    response = await register_user(client)

    assert response.status_code == 409
    assert response.json() == {
        "error": {
            "status": 409,
            "code": "conflict",
            "message": "Email already exists",
            "details": None,
        }
    }


@pytest.mark.asyncio
async def test_register_validation_returns_field_details(client: httpx.AsyncClient) -> None:
    response = await client.post(
        REGISTER_PATH,
        json={"email": "invalid", "name": " ", "password": "short"},
    )

    assert response.status_code == 422
    payload = response.json()["error"]
    assert payload["code"] == "validation_error"
    assert {detail["field"] for detail in payload["details"]} == {
        "body.email",
        "body.name",
        "body.password",
    }


@pytest.mark.asyncio
async def test_login_sets_refresh_cookie_and_returns_access_token(
    client: httpx.AsyncClient,
) -> None:
    assert (await register_user(client)).status_code == 201

    response = await login_user(client)

    assert response.status_code == 200
    assert response.json()["access_token"]
    assert response.json()["token_type"] == "bearer"
    cookie = response.headers["set-cookie"].lower()
    assert f"{settings.REFRESH_COOKIE_NAME}=" in cookie
    assert "httponly" in cookie
    assert "path=/api/v1/auth" in cookie
    assert f"samesite={settings.REFRESH_COOKIE_SAMESITE}" in cookie


@pytest.mark.asyncio
async def test_login_rejects_invalid_credentials(client: httpx.AsyncClient) -> None:
    response = await client.post(
        LOGIN_PATH,
        json={"email": "missing@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


@pytest.mark.asyncio
async def test_login_rejects_inactive_user(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    db_session.add(
        User(
            email="inactive@example.com",
            password_hash=hash_password("secure-password"),
            display_name="Inactive",
            is_active=False,
        )
    )
    await db_session.flush()

    response = await client.post(
        LOGIN_PATH,
        json={"email": "inactive@example.com", "password": "secure-password"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "User account is inactive"


@pytest.mark.asyncio
async def test_refresh_rotates_cookie_and_rejects_reuse(
    client: httpx.AsyncClient,
) -> None:
    assert (await register_user(client)).status_code == 201
    login_response = await login_user(client)
    old_refresh_token = login_response.cookies[settings.REFRESH_COOKIE_NAME]

    refresh_response = await client.post(REFRESH_PATH)

    assert refresh_response.status_code == 200
    assert refresh_response.json()["access_token"]
    assert refresh_response.cookies[settings.REFRESH_COOKIE_NAME] != old_refresh_token

    client.cookies.set(
        settings.REFRESH_COOKIE_NAME,
        old_refresh_token,
        path="/api/v1/auth",
    )
    reused_response = await client.post(REFRESH_PATH)
    assert reused_response.status_code == 401
    assert reused_response.json()["error"]["message"] == "Refresh token has been revoked"


@pytest.mark.asyncio
async def test_refresh_rejects_missing_and_expired_cookie(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    missing_response = await client.post(REFRESH_PATH)
    assert missing_response.status_code == 401

    assert (await register_user(client)).status_code == 201
    login_response = await login_user(client)
    raw_token = login_response.cookies[settings.REFRESH_COOKIE_NAME]
    stored_token = await db_session.scalar(
        select(AuthRefreshToken).where(AuthRefreshToken.token_hash == hash_refresh_token(raw_token))
    )
    assert stored_token is not None
    stored_token.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await db_session.flush()

    expired_response = await client.post(REFRESH_PATH)
    assert expired_response.status_code == 401
    assert expired_response.json()["error"]["message"] == "Refresh token has expired"


@pytest.mark.asyncio
async def test_logout_revokes_refresh_token_and_deletes_cookie(
    client: httpx.AsyncClient,
) -> None:
    assert (await register_user(client)).status_code == 201
    assert (await login_user(client)).status_code == 200

    response = await client.post(LOGOUT_PATH)

    assert response.status_code == 204
    cookie = response.headers["set-cookie"].lower()
    assert f"{settings.REFRESH_COOKIE_NAME}=" in cookie
    assert "max-age=0" in cookie
    assert "path=/api/v1/auth" in cookie
    assert (await client.post(REFRESH_PATH)).status_code == 401
