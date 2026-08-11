"""Domain enumerations shared across persistence models."""

import enum


class UserRole(enum.StrEnum):
    USER = "user"
    ADMIN = "admin"


class ContentType(enum.StrEnum):
    SHADOWING = "shadowing"
    DICTATION = "dictation"
    REFLEX = "reflex"
    LISTENING_TRANSLATION = "listening_translation"


class ContentStatus(enum.StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


class AttemptStatus(enum.StrEnum):
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    COMPLETED = "completed"


class RecordingKind(enum.StrEnum):
    SHADOWING = "shadowing"
    REFLEX = "reflex"
    TUTOR_VOICE = "tutor_voice"


class AiEvaluationStatus(enum.StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class TutorSender(enum.StrEnum):
    USER = "user"
    AI = "ai"
