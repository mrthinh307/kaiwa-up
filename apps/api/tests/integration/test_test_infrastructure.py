import httpx
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_api_client_and_database_fixture_are_configured(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    response = await client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"

    result = await db_session.execute(text("SELECT 1"))

    assert result.scalar_one() == 1
