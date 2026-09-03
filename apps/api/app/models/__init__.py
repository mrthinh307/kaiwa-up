"""SQLAlchemy model registry used by the application and Alembic."""

from app.models.attempt import AiEvaluation, ExerciseAttempt, Recording, ReviewSchedule
from app.models.base import Base, CreatedAtMixin, PrimaryKeyUuidMixin, TimestampMixin
from app.models.content import (
    LearningContent,
    ReflexExercise,
    TranslationExercise,
)
from app.models.gamification import (
    Achievement,
    UserAchievement,
    WeeklyLeaderboardEntry,
    XpTransaction,
)
from app.models.tutor import TutorMessage, TutorSession
from app.models.user import AuthRefreshToken, AvatarMutationWindow, User, UserProgress

__all__ = [
    "Achievement",
    "AiEvaluation",
    "AuthRefreshToken",
    "AvatarMutationWindow",
    "Base",
    "CreatedAtMixin",
    "ExerciseAttempt",
    "LearningContent",
    "PrimaryKeyUuidMixin",
    "Recording",
    "ReflexExercise",
    "ReviewSchedule",
    "TimestampMixin",
    "TranslationExercise",
    "TutorMessage",
    "TutorSession",
    "User",
    "UserAchievement",
    "UserProgress",
    "WeeklyLeaderboardEntry",
    "XpTransaction",
]
