"""Integration coverage for the Listening & Translation API."""

import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.ai import get_ai_gateway
from app.api.dependencies.auth import get_current_user
from app.exceptions.ai import AiTimeoutError
from app.integrations.ai.contracts import EvaluationResult
from app.integrations.ai.providers.fake import FakeAiGateway
from app.main import app
from app.models.attempt import AiEvaluation, ExerciseAttempt
from app.models.content import LearningContent, TranslationExercise
from app.models.enums import (
    AiEvaluationStatus,
    AttemptStatus,
    ContentStatus,
    ContentType,
    JlptLevel,
)
from app.models.gamification import XpTransaction
from app.models.user import User, UserProgress


class SuccessfulTranslationGateway(FakeAiGateway):
    async def evaluate_translation(
        self,
        *,
        source_text: str,
        reference_translation: str,
        user_translation: str,
    ) -> EvaluationResult:
        return EvaluationResult(
            score=82,
            is_acceptable=True,
            feedback="Bản dịch truyền tải đúng ý chính.",
            covered_ideas=["Hai người muốn ngồi gần cửa sổ."],
            missing_ideas=["Thiếu lời mời đi theo nhân viên."],
            suggestions=["Bổ sung câu mời ở cuối hội thoại."],
        )


class TimeoutTranslationGateway(FakeAiGateway):
    async def evaluate_translation(
        self,
        *,
        source_text: str,
        reference_translation: str,
        user_translation: str,
    ) -> EvaluationResult:
        raise AiTimeoutError()


async def create_translation_user(session: AsyncSession, email: str) -> User:
    user = User(email=email, password_hash="hash", display_name="Translation User")
    session.add(user)
    await session.flush()
    return user


async def create_translation_lesson(
    session: AsyncSession,
    *,
    slug: str,
    status: ContentStatus = ContentStatus.PUBLISHED,
) -> LearningContent:
    content = LearningContent(
        content_type=ContentType.LISTENING_TRANSLATION,
        status=status,
        slug=slug,
        title="Đặt bàn tại nhà hàng",
        short_description="Nghe hội thoại và dịch sang tiếng Việt.",
        topic="Nhà hàng",
        difficulty=JlptLevel.N5,
        audio_url="https://example.com/translation.mp3",
        audio_duration_ms=12_000,
        transcript_ja=[
            {
                "start_time_ms": 0,
                "end_time_ms": 12_000,
                "script": "二人です。窓の近くの席はありますか。はい、こちらへどうぞ。",
            }
        ],
        base_exp=25,
    )
    session.add(content)
    await session.flush()
    session.add(
        TranslationExercise(
            content_id=content.id,
            reference_translation_vi=(
                "Hai người. Có chỗ gần cửa sổ không? Vâng, mời quý khách qua đây."
            ),
        )
    )
    await session.flush()
    return content


def override_translation_dependencies(
    user: User,
    gateway: FakeAiGateway,
) -> None:
    async def current_user() -> User:
        return user

    app.dependency_overrides[get_current_user] = current_user
    app.dependency_overrides[get_ai_gateway] = lambda: gateway


@pytest.mark.asyncio
async def test_translation_catalog_and_detail_only_return_published_lessons(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_translation_user(db_session, "translation-catalog@example.com")
    published = await create_translation_lesson(db_session, slug="translation-published")
    draft = await create_translation_lesson(
        db_session,
        slug="translation-draft",
        status=ContentStatus.DRAFT,
    )
    override_translation_dependencies(user, SuccessfulTranslationGateway())

    response = await client.get("/api/v1/listening-translation/lessons")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_items"] == 1
    assert payload["items"][0]["id"] == str(published.id)
    assert payload["items"][0]["is_completed"] is False
    assert str(draft.id) not in {item["id"] for item in payload["items"]}

    detail_response = await client.get(f"/api/v1/listening-translation/lessons/{published.id}")

    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["audio_url"] == "https://example.com/translation.mp3"
    assert "transcript_ja" not in detail
    assert "reference_translation_vi" not in detail


@pytest.mark.asyncio
async def test_submit_translation_persists_evaluation_and_awards_exp(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_translation_user(db_session, "translation-submit@example.com")
    content = await create_translation_lesson(db_session, slug="translation-submit")
    override_translation_dependencies(user, SuccessfulTranslationGateway())

    response = await client.post(
        f"/api/v1/listening-translation/lessons/{content.id}/submit",
        json={"translation_vi": "  Hai người muốn ngồi gần cửa sổ.  "},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["score"] == 82
    assert payload["exp_earned"] == 25
    assert payload["covered_ideas"] == ["Hai người muốn ngồi gần cửa sổ."]
    assert payload["missing_ideas"] == ["Thiếu lời mời đi theo nhân viên."]
    assert payload["suggestions"] == ["Bổ sung câu mời ở cuối hội thoại."]

    attempt = await db_session.scalar(
        select(ExerciseAttempt).where(
            ExerciseAttempt.user_id == user.id,
            ExerciseAttempt.content_id == content.id,
        )
    )
    assert attempt is not None
    assert attempt.status == AttemptStatus.COMPLETED
    assert attempt.answer_payload == {"translation_vi": "Hai người muốn ngồi gần cửa sổ."}
    evaluation = await db_session.scalar(
        select(AiEvaluation).where(AiEvaluation.attempt_id == attempt.id)
    )
    assert evaluation is not None
    assert evaluation.status == AiEvaluationStatus.COMPLETED
    assert evaluation.details is not None
    assert evaluation.details["covered_ideas"] == ["Hai người muốn ngồi gần cửa sổ."]
    progress = await db_session.get(UserProgress, user.id)
    assert progress is not None
    assert progress.total_exp == 25
    assert progress.completed_content_count == 1

    catalog_response = await client.get("/api/v1/listening-translation/lessons")
    detail_response = await client.get(f"/api/v1/listening-translation/lessons/{content.id}")

    assert catalog_response.status_code == 200
    assert catalog_response.json()["items"][0]["is_completed"] is True
    assert detail_response.status_code == 200
    assert detail_response.json()["is_completed"] is True


@pytest.mark.asyncio
async def test_translation_timeout_preserves_answer_and_retry_is_idempotent(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_translation_user(db_session, "translation-retry@example.com")
    content = await create_translation_lesson(db_session, slug="translation-retry")
    override_translation_dependencies(user, TimeoutTranslationGateway())

    timeout_response = await client.post(
        f"/api/v1/listening-translation/lessons/{content.id}/submit",
        json={"translation_vi": "Hai người muốn ngồi gần cửa sổ."},
    )

    assert timeout_response.status_code == 504
    attempt = await db_session.scalar(
        select(ExerciseAttempt).where(ExerciseAttempt.content_id == content.id)
    )
    assert attempt is not None
    assert attempt.status == AttemptStatus.IN_PROGRESS
    assert attempt.answer_payload == {"translation_vi": "Hai người muốn ngồi gần cửa sổ."}
    evaluation = await db_session.scalar(
        select(AiEvaluation).where(AiEvaluation.attempt_id == attempt.id)
    )
    assert evaluation is not None
    assert evaluation.status == AiEvaluationStatus.FAILED
    assert evaluation.error_message == "ai_timeout"
    assert (
        await db_session.scalar(
            select(func.count()).select_from(XpTransaction).where(XpTransaction.user_id == user.id)
        )
        == 0
    )

    override_translation_dependencies(user, SuccessfulTranslationGateway())
    retry_response = await client.post(
        f"/api/v1/listening-translation/lessons/{content.id}/submit",
        json={"translation_vi": "Hai người muốn ngồi gần cửa sổ."},
    )
    repeated_response = await client.post(
        f"/api/v1/listening-translation/lessons/{content.id}/submit",
        json={"translation_vi": "Bản dịch gửi lại không được tạo attempt mới."},
    )

    assert retry_response.status_code == 200
    assert repeated_response.status_code == 200
    assert retry_response.json()["attempt_id"] == str(attempt.id)
    assert repeated_response.json()["attempt_id"] == str(attempt.id)
    assert repeated_response.json()["exp_earned"] == 25
    assert (
        await db_session.scalar(
            select(func.count())
            .select_from(ExerciseAttempt)
            .where(
                ExerciseAttempt.user_id == user.id,
                ExerciseAttempt.content_id == content.id,
            )
        )
        == 1
    )
    assert (
        await db_session.scalar(
            select(func.count()).select_from(XpTransaction).where(XpTransaction.user_id == user.id)
        )
        == 1
    )
    progress = await db_session.get(UserProgress, user.id)
    assert progress is not None
    assert progress.total_exp == 25


@pytest.mark.asyncio
async def test_submit_translation_rejects_blank_free_text(
    client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await create_translation_user(db_session, "translation-blank@example.com")
    content = await create_translation_lesson(db_session, slug="translation-blank")
    override_translation_dependencies(user, SuccessfulTranslationGateway())

    response = await client.post(
        f"/api/v1/listening-translation/lessons/{content.id}/submit",
        json={"translation_vi": "   "},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
