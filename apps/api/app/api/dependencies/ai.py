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


AiGatewayDep = Annotated[AiGateway, Depends(get_ai_gateway)]
