import re
from datetime import datetime

import httpx
import pytest
from sqlalchemy.exc import SQLAlchemyError

import app.api.v1.endpoints.readiness as readiness_endpoint
from app.core import settings
from app.main import app
from app.schemas import PaginatedResponse


def test_all_api_operations_have_unique_lower_camel_case_ids() -> None:
    http_methods = {"delete", "get", "head", "options", "patch", "post", "put", "trace"}
    operation_ids = [
        operation["operationId"]
        for path_item in app.openapi()["paths"].values()
        for method, operation in path_item.items()
        if method in http_methods
    ]

    assert all(operation_ids)
    assert len(operation_ids) == len(set(operation_ids))
    assert all(
        re.fullmatch(r"[a-z][A-Za-z0-9]*", operation_id)
        for operation_id in operation_ids
        if operation_id is not None
    )


def test_auth_and_profile_openapi_contract() -> None:
    schema = app.openapi()
    expected_paths = {
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/api/v1/auth/refresh",
        "/api/v1/auth/logout",
        "/api/v1/users/me",
    }

    assert expected_paths <= schema["paths"].keys()
    assert "/api/v1/register" not in schema["paths"]
    assert "/api/v1/me" not in schema["paths"]
    assert "ErrorResponse" in schema["components"]["schemas"]
    assert "created_at" in schema["components"]["schemas"]["UserResponse"]["required"]
    assert schema["paths"]["/api/v1/auth/register"]["post"]["responses"]["409"]["content"][
        "application/json"
    ]["schema"]["$ref"].endswith("/ErrorResponse")


@pytest.mark.asyncio
async def test_health_endpoint_matches_platform_contract(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"status", "timestamp", "app_name"}
    assert payload["status"] == "ok"
    assert payload["app_name"] == settings.app_name

    timestamp = datetime.fromisoformat(payload["timestamp"].replace("Z", "+00:00"))
    assert timestamp.tzinfo is not None
    assert timestamp.utcoffset().total_seconds() == 0  # type: ignore


@pytest.mark.asyncio
async def test_cors_allows_configured_frontend_origin(client: httpx.AsyncClient) -> None:
    origin = settings.cors_origins[0]
    response = await client.options(
        "/api/v1/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert response.headers["access-control-allow-credentials"] == "true"


@pytest.mark.asyncio
async def test_cors_does_not_allow_unconfigured_origin(client: httpx.AsyncClient) -> None:
    response = await client.get(
        "/api/v1/health",
        headers={"Origin": "https://untrusted.example"},
    )

    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


@pytest.mark.asyncio
async def test_readiness_endpoint_reports_database_ready(
    client: httpx.AsyncClient,
    monkeypatch,
) -> None:
    async def database_is_ready() -> None:
        return None

    monkeypatch.setattr(readiness_endpoint, "check_database_connection", database_is_ready)

    response = await client.get("/api/v1/ready")

    assert response.status_code == 200
    assert response.json()["status"] == "ready"
    assert response.json()["database"] == "ok"


@pytest.mark.asyncio
async def test_readiness_endpoint_returns_service_unavailable_when_database_is_down(
    client: httpx.AsyncClient,
    monkeypatch,
) -> None:
    async def database_is_unavailable() -> None:
        raise SQLAlchemyError("database unavailable")

    monkeypatch.setattr(readiness_endpoint, "check_database_connection", database_is_unavailable)

    response = await client.get("/api/v1/ready")

    assert response.status_code == 503
    assert response.json() == {
        "error": {
            "status": 503,
            "code": "service_unavailable",
            "message": "Database is not ready",
            "details": None,
        }
    }


def test_pagination_response_contains_total_items_and_total_pages() -> None:
    response = PaginatedResponse[int](
        items=[1, 2],
        total_items=42,
        page=2,
        page_size=20,
        total_pages=3,
    )

    assert response.model_dump() == {
        "items": [1, 2],
        "total_items": 42,
        "page": 2,
        "page_size": 20,
        "total_pages": 3,
    }
