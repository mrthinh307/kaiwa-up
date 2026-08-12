from typing import Annotated

from fastapi import APIRouter, Query

from app.api.dependencies.auth import CurrentUser
from app.api.dependencies.database import DatabaseSession
from app.repositories.gamification import GamificationRepository
from app.schemas.gamification import GamificationProfileResponse
from app.services.gamification import GamificationService

router = APIRouter(prefix="/gamification", tags=["Gamification"])


def _gamification_service(session: DatabaseSession) -> GamificationService:
    return GamificationService(GamificationRepository(session))


@router.get(
    "/profile",
    response_model=GamificationProfileResponse,
    summary="Get the current user's EXP, level, and recent EXP history",
)
async def get_gamification_profile(
    current_user: CurrentUser,
    session: DatabaseSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> GamificationProfileResponse:
    return await _gamification_service(session).get_profile(
        current_user.id,
        recent_limit=limit,
    )
