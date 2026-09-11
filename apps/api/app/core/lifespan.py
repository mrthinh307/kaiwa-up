from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.database import engine
from app.core.scheduler import configure_scheduler, scheduler


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    is_scheduler_enabled = configure_scheduler()
    if is_scheduler_enabled:
        scheduler.start()
    try:
        yield
    finally:
        try:
            if is_scheduler_enabled:
                scheduler.shutdown(wait=False)
        finally:
            try:
                from app.api.dependencies.ai import close_ai_gateway

                await close_ai_gateway()
            finally:
                await engine.dispose()
