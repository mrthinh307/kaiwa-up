# apps/api/tests/conftest.py
from pathlib import Path

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.api.dependencies.database import get_db_session
from app.main import app

TEST_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class DatabaseTestSettings(BaseSettings):
    database_url_test: str

    model_config = SettingsConfigDict(
        env_file=TEST_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )


DATABASE_URL_TEST = DatabaseTestSettings().database_url_test

engine_test = create_async_engine(DATABASE_URL_TEST, poolclass=NullPool)
TestSessionLocal = async_sessionmaker(bind=engine_test, expire_on_commit=False, class_=AsyncSession)


@pytest_asyncio.fixture
async def db_session():
    """Mỗi test chạy trong 1 transaction riêng, rollback ngay sau khi test xong.
    => Dữ liệu test không bao giờ được commit thật, an toàn khi nhiều CI run song song."""
    async with engine_test.connect() as conn:
        trans = await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        try:
            yield session
        finally:
            await session.close()
            await trans.rollback()  # cơ chế rollback/cleanup theo yêu cầu


@pytest_asyncio.fixture
async def client(db_session):
    """AsyncClient gọi thẳng vào app, nhưng đã override get_db_session
    để mọi route dùng db_session (transaction sẽ rollback) thay vì session thật."""

    async def _override_get_db_session():
        yield db_session

    app.dependency_overrides[get_db_session] = _override_get_db_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
