"""Public application service classes and instances."""

from app.services.progress import ProgressService
from app.services.user import UserService

__all__ = ["ProgressService", "UserService"]
from app.services.auth import AuthService, auth_service
from app.services.gamification import GamificationService
from app.services.progress import ProgressService
from app.services.user import UserService, user_service

__all__ = [
    "AuthService",
    "GamificationService",
    "ProgressService",
    "UserService",
    "auth_service",
    "user_service",
]
