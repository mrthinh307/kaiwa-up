from collections.abc import Callable
from datetime import UTC, datetime

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.integrations.youtube import YouTubeCaptionProvider, YouTubeTranscript
from app.main import app
from app.models.content import LearningContent
from app.models.enums import ContentStatus, ContentType, JlptLevel, UserRole
from app.models.user import User
from app.schemas.learning_content import TranscriptSegment


async def create_content(
    session: AsyncSession,
    *,
    slug: str,
    status: ContentStatus = ContentStatus.PUBLISHED,
    content_type: ContentType = ContentType.SHADOWING_DICTATION,
) -> LearningContent:
    content = LearningContent(
        content_type=content_type,
        status=status,
        slug=slug,
        title=f"Bài học {slug}",
        short_description="Mô tả bài học",
        topic="Daily",
        difficulty=JlptLevel.N5,
        audio_url="https://www.youtube.com/watch?v=example",
        audio_duration_ms=3500,
        transcript_ja=[
            {"start_time_ms": 0, "end_time_ms": 1500, "script": "秘密の答え一"},
            {"start_time_ms": 1500, "end_time_ms": 3500, "script": "秘密の答え二"},
        ],
        base_exp=50,
        published_at=(
            datetime(2026, 8, 13, tzinfo=UTC) if status == ContentStatus.PUBLISHED else None
        ),
    )
    session.add(content)
    await session.flush()
    return content


async def create_user(session: AsyncSession, *, role: UserRole) -> User:
    user = User(
        email=f"{role.value}@example.com",
        password_hash="password-hash",
        display_name=role.value,
        role=role,
    )
    session.add(user)
    await session.flush()
    return user


def set_current_user(user: User) -> None:
    async def _current_user() -> User:
        return user

    app.dependency_overrides[get_current_user] = _current_user


@pytest.mark.asyncio
async def test_list_learning_contents_returns_only_matching_published_content(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_value: Callable[[str], str],
) -> None:
    published_slug = unique_value("published")
    published = await create_content(db_session, slug=published_slug)
    await create_content(db_session, slug=unique_value("draft"), status=ContentStatus.DRAFT)
    await create_content(db_session, slug=unique_value("reflex"), content_type=ContentType.REFLEX)

    response = await client.get(
        "/api/v1/lessons",
        params={"type": "shadowing_dictation", "difficulty": "N5", "topic": "Daily"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_items"] == 1
    assert payload["items"] == [
        {
            "id": str(published.id),
            "title": f"Bài học {published_slug}",
            "description": "Mô tả bài học",
            "content_type": "shadowing_dictation",
            "difficulty": "N5",
            "topic": "Daily",
            "duration_seconds": 3.5,
            "audio_url": "https://www.youtube.com/watch?v=example",
        }
    ]


@pytest.mark.asyncio
async def test_shadowing_detail_returns_timestamped_transcript(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_value: Callable[[str], str],
) -> None:
    content = await create_content(db_session, slug=unique_value("shadowing-detail"))

    response = await client.get(f"/api/v1/shadowing/lessons/{content.id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["duration_seconds"] == 3.5
    assert payload["transcript"] == [
        {"start_time_ms": 0, "end_time_ms": 1500, "script": "秘密の答え一"},
        {"start_time_ms": 1500, "end_time_ms": 3500, "script": "秘密の答え二"},
    ]


@pytest.mark.asyncio
async def test_dictation_detail_masks_every_transcript_segment(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_value: Callable[[str], str],
) -> None:
    content = await create_content(db_session, slug=unique_value("dictation-detail"))

    response = await client.get(f"/api/v1/dictation/lessons/{content.id}")

    assert response.status_code == 200
    assert "秘密の答え" not in response.text
    assert response.json()["prompts"] == [
        {
            "blank_index": 1,
            "start_time_ms": 0,
            "end_time_ms": 1500,
            "prompt": "___ (1)",
        },
        {
            "blank_index": 2,
            "start_time_ms": 1500,
            "end_time_ms": 3500,
            "prompt": "___ (2)",
        },
    ]


@pytest.mark.asyncio
async def test_specialized_detail_rejects_other_content_types(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_value: Callable[[str], str],
) -> None:
    content = await create_content(
        db_session,
        slug=unique_value("reflex-detail"),
        content_type=ContentType.REFLEX,
    )

    response = await client.get(f"/api/v1/shadowing/lessons/{content.id}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


@pytest.mark.asyncio
async def test_admin_creates_draft_content_from_youtube_captions(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    admin = await create_user(db_session, role=UserRole.ADMIN)
    set_current_user(admin)

    async def fetch_japanese(_: YouTubeCaptionProvider, youtube_url: str) -> YouTubeTranscript:
        assert youtube_url == "https://youtu.be/dQw4w9WgXcQ"
        return YouTubeTranscript(
            video_id="dQw4w9WgXcQ",
            canonical_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            segments=[
                TranscriptSegment(
                    start_time_ms=0,
                    end_time_ms=1540,
                    script="こんにちは。",
                )
            ],
        )

    monkeypatch.setattr(YouTubeCaptionProvider, "fetch_japanese", fetch_japanese)

    response = await client.post(
        "/api/v1/lessons",
        json={
            "youtube_url": "https://youtu.be/dQw4w9WgXcQ",
            "title": "Lời chào tiếng Nhật",
            "difficulty": "N5",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["slug"] == "youtube-dQw4w9WgXcQ"
    assert payload["status"] == "draft"
    assert payload["audio_url"] == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    assert payload["duration_seconds"] == 1.54
    assert payload["transcript"] == [
        {"start_time_ms": 0, "end_time_ms": 1540, "script": "こんにちは。"}
    ]


@pytest.mark.asyncio
async def test_regular_user_cannot_create_learning_content(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_value: Callable[[str], str],
) -> None:
    user = await create_user(db_session, role=UserRole.USER)
    set_current_user(user)

    response = await client.post(
        "/api/v1/lessons",
        json={"youtube_url": "https://youtu.be/dQw4w9WgXcQ"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_admin_publishes_draft_learning_content(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_value: Callable[[str], str],
) -> None:
    admin = await create_user(db_session, role=UserRole.ADMIN)
    draft = await create_content(
        db_session,
        slug=unique_value("draft-to-publish"),
        status=ContentStatus.DRAFT,
    )
    set_current_user(admin)

    response = await client.post(f"/api/v1/lessons/{draft.id}/publish")

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == str(draft.id)
    assert payload["status"] == "published"
    assert payload["published_at"] is not None
    await db_session.refresh(draft)
    assert draft.status == ContentStatus.PUBLISHED
    assert draft.published_at is not None


@pytest.mark.asyncio
async def test_publish_rejects_already_published_content(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_value: Callable[[str], str],
) -> None:
    admin = await create_user(db_session, role=UserRole.ADMIN)
    published = await create_content(db_session, slug=unique_value("already-published"))
    original_published_at = published.published_at
    set_current_user(admin)

    response = await client.post(f"/api/v1/lessons/{published.id}/publish")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "learning_content_already_published"
    await db_session.refresh(published)
    assert published.published_at == original_published_at


@pytest.mark.asyncio
async def test_regular_user_cannot_publish_learning_content(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_value: Callable[[str], str],
) -> None:
    user = await create_user(db_session, role=UserRole.USER)
    draft = await create_content(
        db_session,
        slug=unique_value("unauthorized-publish"),
        status=ContentStatus.DRAFT,
    )
    set_current_user(user)

    response = await client.post(f"/api/v1/lessons/{draft.id}/publish")

    assert response.status_code == 403
    await db_session.refresh(draft)
    assert draft.status == ContentStatus.DRAFT


@pytest.mark.asyncio
async def test_publish_rejects_incomplete_draft(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
    unique_value: Callable[[str], str],
) -> None:
    admin = await create_user(db_session, role=UserRole.ADMIN)
    draft = await create_content(
        db_session,
        slug=unique_value("incomplete-draft"),
        status=ContentStatus.DRAFT,
    )
    draft.transcript_ja = []
    await db_session.flush()
    set_current_user(admin)

    response = await client.post(f"/api/v1/lessons/{draft.id}/publish")

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"]["code"] == "learning_content_not_ready"
    assert "transcript_ja" in payload["error"]["details"]["required_fields"]
