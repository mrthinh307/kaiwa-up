import uuid
from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from app.models.attempt import ExerciseAttempt
from app.models.enums import AttemptStatus, ContentType, JlptLevel, PracticeMethod
from app.repositories.progress import (
    AttemptDetailRow,
    AttemptHistoryRow,
    InProgressLessonRow,
    ProgressRepository,
)
from app.services.progress import ProgressService


@pytest.mark.asyncio
async def test_summary_counts_merged_shadowing_dictation_content() -> None:
    repository = AsyncMock(spec=ProgressRepository)
    repository.get_summary.return_value = (
        5,
        {
            ContentType.SHADOWING_DICTATION: 3,
            ContentType.LISTENING_TRANSLATION: 1,
        },
        {
            PracticeMethod.SHADOWING: 1,
            PracticeMethod.DICTATION: 1,
            PracticeMethod.LISTENING_TRANSLATION: 1,
        },
    )
    repository.get_in_progress_lessons.return_value = [
        InProgressLessonRow(
            id=uuid.uuid4(),
            content_id=uuid.uuid4(),
            content_title="Ongoing lesson",
            content_type=ContentType.REFLEX,
            practice_method=PracticeMethod.REFLEX,
            difficulty=JlptLevel.N4,
            attempt_number=2,
        )
    ]

    summary = await ProgressService(repository).get_summary(uuid.uuid4())

    assert summary.model_dump(mode="json") == {
        "shadowing_completed": 1,
        "dictation_completed": 1,
        "shadowing_dictation_completed": 3,
        "reflex_completed": 0,
        "listening_translation_completed": 1,
        "total_completed_attempts": 4,
        "total_attempts": 5,
        "in_progress_lessons": [
            {
                "id": str(summary.in_progress_lessons[0].id),
                "content_id": str(summary.in_progress_lessons[0].content_id),
                "content_title": "Ongoing lesson",
                "content_type": "reflex",
                "practice_method": "reflex",
                "difficulty": "N4",
                "attempt_number": 2,
            }
        ],
    }


@pytest.mark.asyncio
async def test_list_attempts_forwards_status_and_search_query() -> None:
    repository = AsyncMock(spec=ProgressRepository)
    repository.list_attempts.return_value = ([], 0)
    user_id = uuid.uuid4()

    await ProgressService(repository).list_attempts(
        user_id,
        content_type=ContentType.SHADOWING_DICTATION,
        practice_method=PracticeMethod.DICTATION,
        content_id=None,
        status=AttemptStatus.IN_PROGRESS,
        search_query="weather",
        page=2,
        page_size=10,
    )

    repository.list_attempts.assert_awaited_once_with(
        user_id,
        content_type=ContentType.SHADOWING_DICTATION,
        practice_method=PracticeMethod.DICTATION,
        content_id=None,
        status=AttemptStatus.IN_PROGRESS,
        search_query="weather",
        limit=10,
        offset=10,
    )


@pytest.mark.asyncio
async def test_list_attempts_converts_decimal_score_to_float() -> None:
    repository = AsyncMock(spec=ProgressRepository)
    repository.list_attempts.return_value = (
        [
            AttemptHistoryRow(
                id=uuid.uuid4(),
                content_id=uuid.uuid4(),
                content_title="Listening lesson",
                content_type=ContentType.SHADOWING_DICTATION,
                practice_method=PracticeMethod.SHADOWING,
                attempt_number=1,
                status=AttemptStatus.COMPLETED,
                score=Decimal("87.50"),
                completed_at=datetime(2026, 8, 12, tzinfo=UTC),
            )
        ],
        1,
    )

    response = await ProgressService(repository).list_attempts(
        uuid.uuid4(),
        content_type=None,
        practice_method=None,
        content_id=None,
        status=None,
        search_query=None,
        page=1,
        page_size=20,
    )

    assert response.items[0].score == 87.5
    assert isinstance(response.items[0].score, float)


@pytest.mark.asyncio
async def test_attempt_detail_converts_decimal_score_to_float() -> None:
    repository = AsyncMock(spec=ProgressRepository)
    user_id = uuid.uuid4()
    attempt = ExerciseAttempt(
        id=uuid.uuid4(),
        user_id=user_id,
        content_id=uuid.uuid4(),
        attempt_number=1,
        practice_method=PracticeMethod.DICTATION,
        status=AttemptStatus.COMPLETED,
        score=Decimal("92.50"),
        started_at=datetime(2026, 8, 12, tzinfo=UTC),
    )
    repository.get_attempt_detail.return_value = AttemptDetailRow(
        attempt=attempt,
        content_type=ContentType.SHADOWING_DICTATION,
    )

    response = await ProgressService(repository).get_attempt_detail(user_id, attempt.id)

    assert response.score == 92.5
    assert response.practice_method == PracticeMethod.DICTATION
    assert isinstance(response.score, float)
