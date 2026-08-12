import uuid
from unittest.mock import AsyncMock

import pytest

from app.models.enums import ContentType
from app.repositories.progress import ProgressRepository
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
    )

    summary = await ProgressService(repository).get_summary(uuid.uuid4())

    assert summary.model_dump() == {
        "shadowing_dictation_completed": 3,
        "reflex_completed": 0,
        "listening_translation_completed": 1,
        "total_completed_attempts": 4,
        "total_attempts": 5,
    }
