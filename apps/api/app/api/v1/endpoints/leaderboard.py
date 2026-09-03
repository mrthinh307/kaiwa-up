from typing import Annotated

from fastapi import APIRouter, Query

from app.api.dependencies.auth import CurrentUser
from app.api.dependencies.database import DatabaseSession
from app.repositories.leaderboard import LeaderboardRepository
from app.schemas.leaderboard import WeeklyLeaderboardData
from app.services.leaderboard import LeaderboardService
from app.utils.datetime_utils import utc_now, week_start_for

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


def _leaderboard_service(session: DatabaseSession) -> LeaderboardService:
    return LeaderboardService(LeaderboardRepository(session))


@router.get(
    "/weekly",
    operation_id="getWeeklyLeaderboard",
    response_model=WeeklyLeaderboardData,
    summary="Get the weekly EXP leaderboard and the current user's rank",
)
async def get_weekly_leaderboard(
    current_user: CurrentUser,
    session: DatabaseSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> WeeklyLeaderboardData:
    return await _leaderboard_service(session).get_weekly(
        user_id=current_user.id,
        week_start=week_start_for(utc_now().date()),
        limit=limit,
    )
