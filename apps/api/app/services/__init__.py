"""Public application service classes and instances."""

from app.services.auth import AuthService, auth_service
from app.services.gamification import GamificationService
from app.services.leaderboard import LeaderboardService
from app.services.progress import ProgressService
from app.services.tutor import TutorService
from app.services.user import UserService, user_service

__all__ = [
    "AuthService",
    "GamificationService",
    "LeaderboardService",
    "ProgressService",
    "UserService",
    "TutorService",
    "auth_service",
    "user_service",
]
