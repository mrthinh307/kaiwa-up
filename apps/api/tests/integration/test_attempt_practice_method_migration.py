import runpy
from pathlib import Path
from uuid import UUID

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import ExerciseAttempt
from app.models.content import LearningContent
from app.models.enums import (
    AttemptStatus,
    ContentStatus,
    ContentType,
    JlptLevel,
    PracticeMethod,
)
from app.models.user import User
from tests.conftest import UniqueValueFactory

MIGRATION_PATH = (
    Path(__file__).resolve().parents[2]
    / "alembic"
    / "versions"
    / "9c4e1a7b2d6f_add_attempt_practice_method.py"
)
BACKFILL_SQL = runpy.run_path(str(MIGRATION_PATH))["BACKFILL_SQL"]


async def create_content(
    session: AsyncSession,
    *,
    content_type: ContentType,
    slug: str,
) -> LearningContent:
    content = LearningContent(
        content_type=content_type,
        status=ContentStatus.PUBLISHED,
        slug=slug,
        title=slug,
        difficulty=JlptLevel.N5,
        base_exp=50,
    )
    session.add(content)
    await session.flush()
    return content


def create_attempt(
    *,
    user_id: UUID,
    content_id: UUID,
    attempt_number: int,
    status: AttemptStatus,
    answer_payload: dict[str, object],
) -> ExerciseAttempt:
    return ExerciseAttempt(
        user_id=user_id,
        content_id=content_id,
        attempt_number=attempt_number,
        practice_method=None,
        status=status,
        answer_payload=answer_payload,
    )


@pytest.mark.asyncio
async def test_practice_method_backfill_classifies_only_deterministic_attempts(
    db_session: AsyncSession,
    unique_value: UniqueValueFactory,
) -> None:
    user = User(
        email=f"{unique_value('practice-method-migration')}@example.com",
        password_hash="password-hash",
    )
    db_session.add(user)
    await db_session.flush()
    shared_content = await create_content(
        db_session,
        content_type=ContentType.SHADOWING_DICTATION,
        slug=unique_value("shared-content"),
    )
    reflex_content = await create_content(
        db_session,
        content_type=ContentType.REFLEX,
        slug=unique_value("reflex-content"),
    )
    translation_content = await create_content(
        db_session,
        content_type=ContentType.LISTENING_TRANSLATION,
        slug=unique_value("translation-content"),
    )

    completed_shadowing = create_attempt(
        user_id=user.id,
        content_id=shared_content.id,
        attempt_number=1,
        status=AttemptStatus.COMPLETED,
        answer_payload={"mode": "segmented", "segments": []},
    )
    completed_dictation = create_attempt(
        user_id=user.id,
        content_id=shared_content.id,
        attempt_number=2,
        status=AttemptStatus.COMPLETED,
        answer_payload={"segments": [{"segment_index": 0, "user_answer": "回答"}]},
    )
    empty_legacy = create_attempt(
        user_id=user.id,
        content_id=shared_content.id,
        attempt_number=3,
        status=AttemptStatus.COMPLETED,
        answer_payload={},
    )
    ambiguous_legacy = create_attempt(
        user_id=user.id,
        content_id=shared_content.id,
        attempt_number=4,
        status=AttemptStatus.COMPLETED,
        answer_payload={
            "mode": "segmented",
            "segments": [{"segment_index": 0, "segment_id": "0"}],
        },
    )
    older_active_shadowing = create_attempt(
        user_id=user.id,
        content_id=shared_content.id,
        attempt_number=5,
        status=AttemptStatus.IN_PROGRESS,
        answer_payload={"mode": "segmented", "segments": []},
    )
    newest_active_shadowing = create_attempt(
        user_id=user.id,
        content_id=shared_content.id,
        attempt_number=6,
        status=AttemptStatus.IN_PROGRESS,
        answer_payload={"mode": "continuous", "continuous_recording": {}},
    )
    completed_reflex = create_attempt(
        user_id=user.id,
        content_id=reflex_content.id,
        attempt_number=1,
        status=AttemptStatus.COMPLETED,
        answer_payload={"transcript": "回答"},
    )
    completed_translation = create_attempt(
        user_id=user.id,
        content_id=translation_content.id,
        attempt_number=1,
        status=AttemptStatus.COMPLETED,
        answer_payload={"translation_vi": "Bản dịch"},
    )
    attempts = [
        completed_shadowing,
        completed_dictation,
        empty_legacy,
        ambiguous_legacy,
        older_active_shadowing,
        newest_active_shadowing,
        completed_reflex,
        completed_translation,
    ]
    db_session.add_all(attempts)
    await db_session.flush()

    await db_session.execute(BACKFILL_SQL)
    for attempt in attempts:
        await db_session.refresh(attempt)

    assert completed_shadowing.practice_method == PracticeMethod.SHADOWING
    assert completed_dictation.practice_method == PracticeMethod.DICTATION
    assert empty_legacy.practice_method is None
    assert ambiguous_legacy.practice_method is None
    assert older_active_shadowing.practice_method is None
    assert newest_active_shadowing.practice_method == PracticeMethod.SHADOWING
    assert completed_reflex.practice_method == PracticeMethod.REFLEX
    assert completed_translation.practice_method == PracticeMethod.LISTENING_TRANSLATION
