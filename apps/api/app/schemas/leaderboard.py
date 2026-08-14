import uuid
from datetime import date

from pydantic import BaseModel, Field


class LeaderboardUser(BaseModel):
    rank: int = Field(ge=1)
    user_id: uuid.UUID
    display_name: str | None
    weekly_exp: int = Field(ge=0)


class WeeklyLeaderboardData(BaseModel):
    week_start: date
    user_rank: LeaderboardUser | None = None
    rankings: list[LeaderboardUser] = Field(default_factory=list)


class WeeklyLeaderboardResponse(BaseModel):
    response: WeeklyLeaderboardData
