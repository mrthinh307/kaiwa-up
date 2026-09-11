import importlib
from collections.abc import Iterator

import pytest
from fastapi import FastAPI

from app.api.dependencies import ai as ai_dependencies
from app.integrations.ai.providers.fake import FakeAiGateway


class TrackingGateway(FakeAiGateway):
    def __init__(self) -> None:
        self.close_count = 0

    async def aclose(self) -> None:
        self.close_count += 1


class FailingGateway(TrackingGateway):
    async def aclose(self) -> None:
        await super().aclose()
        raise RuntimeError("close failed")


class TrackingEngine:
    def __init__(self) -> None:
        self.is_disposed = False

    async def dispose(self) -> None:
        self.is_disposed = True


@pytest.fixture(autouse=True)
def clear_ai_gateway_cache() -> Iterator[None]:
    ai_dependencies.get_ai_gateway.cache_clear()
    yield
    ai_dependencies.get_ai_gateway.cache_clear()


@pytest.mark.asyncio
async def test_lifespan_closes_cached_ai_gateway_and_clears_cache(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    lifespan_module = importlib.import_module("app.core.lifespan")
    gateway = TrackingGateway()
    engine = TrackingEngine()
    monkeypatch.setattr(ai_dependencies, "build_ai_gateway", lambda _settings: gateway)
    monkeypatch.setattr(lifespan_module, "configure_scheduler", lambda: False)
    monkeypatch.setattr(lifespan_module, "engine", engine)

    assert ai_dependencies.get_ai_gateway() is gateway
    async with lifespan_module.lifespan(FastAPI()):
        pass

    assert gateway.close_count == 1
    assert ai_dependencies.get_ai_gateway.cache_info().currsize == 0
    assert engine.is_disposed


@pytest.mark.asyncio
async def test_lifespan_disposes_engine_when_ai_gateway_close_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    lifespan_module = importlib.import_module("app.core.lifespan")
    gateway = FailingGateway()
    engine = TrackingEngine()
    monkeypatch.setattr(ai_dependencies, "build_ai_gateway", lambda _settings: gateway)
    monkeypatch.setattr(lifespan_module, "configure_scheduler", lambda: False)
    monkeypatch.setattr(lifespan_module, "engine", engine)

    ai_dependencies.get_ai_gateway()
    with pytest.raises(RuntimeError, match="close failed"):
        async with lifespan_module.lifespan(FastAPI()):
            pass

    assert gateway.close_count == 1
    assert ai_dependencies.get_ai_gateway.cache_info().currsize == 0
    assert engine.is_disposed
