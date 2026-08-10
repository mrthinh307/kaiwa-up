# apps/api/tests/conftest.py
import os

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.dependencies.database import get_db_session
from app.main import app

DATABASE_URL_TEST = os.environ["DATABASE_URL_TEST"]

engine_test = create_async_engine(DATABASE_URL_TEST, pool_pre_ping=True)
TestSessionLocal = async_sessionmaker(
    bind=engine_test, expire_on_commit=False, class_=AsyncSession
)


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
            await trans.rollback()  #cơ chế rollback/cleanup theo yêu cầu


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