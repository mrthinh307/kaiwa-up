import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ExpHistoryItem(BaseModel):
    id: uuid.UUID
    attempt_id: uuid.UUID | None = None
    amount: int = Field(ge=0)
    reason: str | None = None
    created_at: datetime


class GamificationProfileResponse(BaseModel):
    level: int = Field(ge=1)
    level_title: str
    total_exp: int = Field(ge=0)
    current_level_min_exp: int = Field(ge=0)
    next_level_min_exp: int | None = Field(default=None, ge=0)
    exp_to_next_level: int = Field(ge=0)
    recent_exp_history: list[ExpHistoryItem] = Field(default_factory=list)
