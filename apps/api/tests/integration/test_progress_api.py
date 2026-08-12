from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.main import app
from app.models.attempt import ExerciseAttempt
from app.models.content import LearningContent
from app.models.enums import AttemptStatus, ContentStatus, ContentType
from app.models.user import User

SUMMARY_PATH = "/api/v1/progress/summary"
ATTEMPTS_PATH = "/api/v1/progress/attempts"


async def create_user(session: AsyncSession, *, email: str, display_name: str) -> User:
    user = User(email=email, password_hash="password-hash", display_name=display_name)
    session.add(user)
    await session.flush()
    return user


async def create_content(
    session: AsyncSession,
    *,
    content_type: ContentType,
    slug: str,
    title: str,
) -> LearningContent:
    content = LearningContent(
        content_type=content_type,
        status=ContentStatus.PUBLISHED,
        slug=slug,
        title=title,
        difficulty=1,
        base_exp=50,
    )
    session.add(content)
    await session.flush()
    return content


async def create_attempt(
    session: AsyncSession,
    *,
    user_id: UUID,
    content_id: UUID,
    attempt_number: int,
    status: AttemptStatus = AttemptStatus.COMPLETED,
    score: float | None = None,
    completed_at: datetime | None = None,
    answer_payload: dict[str, object] | None = None,
) -> ExerciseAttempt:
    started_at = completed_at or datetime.now(UTC)
    attempt = ExerciseAttempt(
        user_id=user_id,
        content_id=content_id,
        attempt_number=attempt_number,
        status=status,
        score=score,
        started_at=started_at,
        completed_at=completed_at,
        answer_payload=answer_payload,
    )
    session.add(attempt)
    await session.flush()
    return attempt


def set_current_user(user: User) -> None:
    async def _current_user() -> User:
        return user

    app.dependency_overrides[get_current_user] = _current_user


def parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@pytest.mark.asyncio
async def test_progress_summary_counts_completed_by_content_type(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com", display_name="User A")
    shadow = await create_content(
        session=db_session, content_type=ContentType.SHADOWING, slug="shadow", title="Shadow lesson"
    )
    dictation = await create_content(
        session=db_session,
        content_type=ContentType.DICTATION,
        slug="dictation",
        title="Dictation lesson",
    )
    reflex = await create_content(
        session=db_session, content_type=ContentType.REFLEX, slug="reflex", title="Reflex lesson"
    )
    translation = await create_content(
        session=db_session,
        content_type=ContentType.LISTENING_TRANSLATION,
        slug="translation",
        title="Translation lesson",
    )
    await create_attempt(
        session=db_session, user_id=user.id, content_id=shadow.id, attempt_number=1
    )
    await create_attempt(
        session=db_session, user_id=user.id, content_id=shadow.id, attempt_number=2
    )
    await create_attempt(
        session=db_session, user_id=user.id, content_id=dictation.id, attempt_number=1
    )
    await create_attempt(
        session=db_session, user_id=user.id, content_id=translation.id, attempt_number=1
    )
    await create_attempt(
        session=db_session,
        user_id=user.id,
        content_id=reflex.id,
        attempt_number=1,
        status=AttemptStatus.IN_PROGRESS,
    )

    set_current_user(user)

    response = await client.get(SUMMARY_PATH)

    assert response.status_code == 200
    assert response.json() == {
        "shadowing_completed": 2,
        "dictation_completed": 1,
        "reflex_completed": 0,
        "listening_translation_completed": 1,
        "total_completed_attempts": 4,
        "total_attempts": 5,
    }


@pytest.mark.asyncio
async def test_progress_summary_only_uses_current_user_data(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user_a = await create_user(session=db_session, email="a@example.com", display_name="User A")
    user_b = await create_user(session=db_session, email="b@example.com", display_name="User B")
    content = await create_content(
        session=db_session, content_type=ContentType.DICTATION, slug="dictation", title="Dictation"
    )
    await create_attempt(
        session=db_session, user_id=user_b.id, content_id=content.id, attempt_number=1
    )

    set_current_user(user_a)

    response = await client.get(SUMMARY_PATH)

    assert response.status_code == 200
    assert response.json() == {
        "shadowing_completed": 0,
        "dictation_completed": 0,
        "reflex_completed": 0,
        "listening_translation_completed": 0,
        "total_completed_attempts": 0,
        "total_attempts": 0,
    }


@pytest.mark.asyncio
async def test_progress_attempts_support_pagination(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com", display_name="User A")
    content = await create_content(
        session=db_session, content_type=ContentType.SHADOWING, slug="shadow", title="Shadow"
    )
    for index in range(25):
        await create_attempt(
            session=db_session,
            user_id=user.id,
            content_id=content.id,
            attempt_number=index + 1,
            completed_at=datetime(2026, 8, 1, tzinfo=UTC) + timedelta(hours=index),
        )

    set_current_user(user)

    response = await client.get(ATTEMPTS_PATH, params={"page": 2, "page_size": 10})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_items"] == 25
    assert payload["total_pages"] == 3
    assert payload["page"] == 2
    assert payload["page_size"] == 10
    assert len(payload["items"]) == 10
    assert payload["items"][0]["attempt_number"] == 15


@pytest.mark.asyncio
async def test_progress_attempts_filter_by_content_type(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com", display_name="User A")
    shadow = await create_content(
        session=db_session, content_type=ContentType.SHADOWING, slug="shadow", title="Shadow"
    )
    dictation = await create_content(
        session=db_session, content_type=ContentType.DICTATION, slug="dictation", title="Dictation"
    )
    await create_attempt(
        session=db_session, user_id=user.id, content_id=shadow.id, attempt_number=1
    )
    await create_attempt(
        session=db_session, user_id=user.id, content_id=dictation.id, attempt_number=1
    )

    set_current_user(user)

    response = await client.get(ATTEMPTS_PATH, params={"content_type": "shadowing"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_items"] == 1
    assert payload["items"][0]["content_id"] == str(shadow.id)
    assert payload["items"][0]["content_type"] == "shadowing"
    assert payload["items"][0]["content_title"] == "Shadow"


@pytest.mark.asyncio
async def test_progress_attempts_filter_by_content_id(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com", display_name="User A")
    content_a = await create_content(
        session=db_session, content_type=ContentType.SHADOWING, slug="a", title="Lesson A"
    )
    content_b = await create_content(
        session=db_session, content_type=ContentType.DICTATION, slug="b", title="Lesson B"
    )
    await create_attempt(
        session=db_session, user_id=user.id, content_id=content_a.id, attempt_number=1
    )
    await create_attempt(
        session=db_session, user_id=user.id, content_id=content_b.id, attempt_number=1
    )

    set_current_user(user)

    response = await client.get(ATTEMPTS_PATH, params={"content_id": str(content_a.id)})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_items"] == 1
    assert payload["items"][0]["content_id"] == str(content_a.id)


@pytest.mark.asyncio
async def test_progress_attempts_sorted_newest_first(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com", display_name="User A")
    content = await create_content(
        session=db_session, content_type=ContentType.DICTATION, slug="dictation", title="Dictation"
    )
    completions = []
    for index in range(5):
        completion = datetime(2026, 8, 1 + index, 10, tzinfo=UTC)
        completions.append(completion)
        await create_attempt(
            session=db_session,
            user_id=user.id,
            content_id=content.id,
            attempt_number=index + 1,
            completed_at=completion,
        )

    set_current_user(user)

    response = await client.get(ATTEMPTS_PATH, params={"page_size": 20})

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 5
    returned_times = [
        parse_datetime(item["completed_at"]) for item in items if item["completed_at"] is not None
    ]
    assert returned_times == sorted(completions, reverse=True)


@pytest.mark.asyncio
async def test_progress_attempts_include_in_progress_items(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com", display_name="User A")
    content = await create_content(
        session=db_session, content_type=ContentType.SHADOWING, slug="shadow", title="Shadow"
    )
    await create_attempt(
        session=db_session,
        user_id=user.id,
        content_id=content.id,
        attempt_number=1,
        status=AttemptStatus.IN_PROGRESS,
        score=None,
    )

    set_current_user(user)

    response = await client.get(ATTEMPTS_PATH)

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_items"] == 1
    item = payload["items"][0]
    assert item["status"] == "in_progress"
    assert item["score"] is None
    assert item["completed_at"] is None


@pytest.mark.asyncio
async def test_progress_attempt_detail_returns_attempt(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com", display_name="User A")
    content = await create_content(
        session=db_session, content_type=ContentType.DICTATION, slug="dictation", title="Dictation"
    )
    completed_at = datetime(2026, 8, 10, 8, 10, tzinfo=UTC)
    attempt = await create_attempt(
        session=db_session,
        user_id=user.id,
        content_id=content.id,
        attempt_number=2,
        score=95.0,
        completed_at=completed_at,
        answer_payload={"answer_text": "今日はいい天気ですね"},
    )

    set_current_user(user)

    response = await client.get(f"{ATTEMPTS_PATH}/{attempt.id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == str(attempt.id)
    assert payload["content_id"] == str(content.id)
    assert payload["content_type"] == "dictation"
    assert payload["attempt_number"] == 2
    assert payload["status"] == "completed"
    assert payload["score"] == 95.0
    assert payload["answer_payload"] == {"answer_text": "今日はいい天気ですね"}
    assert parse_datetime(payload["completed_at"]) == completed_at


@pytest.mark.asyncio
async def test_progress_attempt_detail_forbidden_for_other_user(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user_a = await create_user(session=db_session, email="a@example.com", display_name="User A")
    user_b = await create_user(session=db_session, email="b@example.com", display_name="User B")
    content = await create_content(
        session=db_session, content_type=ContentType.DICTATION, slug="dictation", title="Dictation"
    )
    attempt = await create_attempt(
        session=db_session, user_id=user_b.id, content_id=content.id, attempt_number=1
    )

    set_current_user(user_a)

    response = await client.get(f"{ATTEMPTS_PATH}/{attempt.id}")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_progress_attempt_detail_not_found_for_invalid_attempt(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com", display_name="User A")
    set_current_user(user)

    response = await client.get(f"{ATTEMPTS_PATH}/{uuid4()}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


@pytest.mark.asyncio
async def test_progress_endpoints_reject_unauthenticated_requests(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    del db_session

    response = await client.get(SUMMARY_PATH)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


@pytest.mark.asyncio
async def test_progress_attempts_reject_invalid_content_type(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_user(session=db_session, email="a@example.com", display_name="User A")
    set_current_user(user)

    response = await client.get(ATTEMPTS_PATH, params={"content_type": "not-a-mode"})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
