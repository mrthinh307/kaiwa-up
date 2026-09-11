"""AI Gateway dependency."""

from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.integrations.ai import AiGateway, build_ai_gateway


@lru_cache
def get_ai_gateway() -> AiGateway:
    """Build the configured AI Gateway once per process."""
    settings: Settings = get_settings()
    return build_ai_gateway(settings)


async def close_ai_gateway() -> None:
    """Close the process-scoped gateway if it was created."""
    if get_ai_gateway.cache_info().currsize == 0:
        return
    gateway = get_ai_gateway()
    get_ai_gateway.cache_clear()
    await gateway.aclose()


AiGatewayDep = Annotated[AiGateway, Depends(get_ai_gateway)]
