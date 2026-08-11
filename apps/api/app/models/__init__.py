"""SQLAlchemy model registry used by the application and Alembic."""

from app.models.attempt import AiEvaluation, ExerciseAttempt, Recording, ReviewSchedule
from app.models.base import Base, CreatedAtMixin, PrimaryKeyUuidMixin, TimestampMixin
from app.models.content import (
    DictationExercise,
    LearningContent,
    ReflexExercise,
    ShadowingExercise,
    TranslationExercise,
)
from app.models.gamification import (
    Achievement,
    LevelDefinition,
    UserAchievement,
    WeeklyLeaderboardEntry,
    XpTransaction,
)
from app.models.tutor import TutorMessage, TutorSession
from app.models.user import AuthRefreshToken, User, UserProgress

__all__ = [
    "Achievement",
    "AiEvaluation",
    "AuthRefreshToken",
    "Base",
    "CreatedAtMixin",
    "DictationExercise",
    "ExerciseAttempt",
    "LearningContent",
    "LevelDefinition",
    "PrimaryKeyUuidMixin",
    "Recording",
    "ReflexExercise",
    "ReviewSchedule",
    "ShadowingExercise",
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
