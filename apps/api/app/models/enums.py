"""Domain enumerations shared across persistence models."""

import enum


class UserRole(enum.StrEnum):
    USER = "user"
    ADMIN = "admin"


class ContentType(enum.StrEnum):
    SHADOWING_DICTATION = "shadowing_dictation"
    REFLEX = "reflex"
    LISTENING_TRANSLATION = "listening_translation"


class ContentStatus(enum.StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


class JlptLevel(enum.StrEnum):
    N5 = "N5"
    N4 = "N4"
    N3 = "N3"
    N2 = "N2"
    N1 = "N1"


class AttemptStatus(enum.StrEnum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class PracticeMethod(enum.StrEnum):
    SHADOWING = "shadowing"
    DICTATION = "dictation"
    REFLEX = "reflex"
    LISTENING_TRANSLATION = "listening_translation"


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


class TutorExplanationLanguage(enum.StrEnum):
    VI = "vi"
    EN = "en"
    JA = "ja"
