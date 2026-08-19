import uuid
from datetime import timedelta

from fastapi import UploadFile

from app.exceptions import NotFoundError
from app.exceptions.reflex import ReflexAudioTooLargeError, ReflexInvalidAudioError
from app.integrations.ai import AiGateway
from app.models.content import LearningContent
from app.repositories.gamification import GamificationRepository
from app.repositories.reflex import ReflexRepository
from app.schemas.reflex import (
    ReflexEvaluationResponse,
    ReflexLessonDetail,
    ReflexLessonItem,
    ReviewScheduleItem,
)
from app.services.gamification import GamificationService
from app.utils.datetime_utils import utc_now

MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024
SUPPORTED_AUDIO_MIME_TYPES = frozenset(
    {"audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/x-wav", "audio/webm"}
)


def review_interval_days(score: int) -> int:
    if score < 50:
        return 1
    if score < 70:
        return 3
    if score < 85:
        return 5
    return 7


class ReflexService:
    def __init__(self, repository: ReflexRepository, ai_gateway: AiGateway) -> None:
        self.repository = repository
        self.ai_gateway = ai_gateway

    async def list_lessons(self) -> list[ReflexLessonItem]:
        contents = await self.repository.list_published_lessons()
        return [self._lesson_item(content) for content in contents]

    async def get_lesson(self, content_id: uuid.UUID) -> ReflexLessonDetail:
        content = await self.repository.get_published_lesson(content_id)
        if content is None or content.reflex is None:
            raise NotFoundError("Reflex lesson not found")
        item = self._lesson_item(content)
        return ReflexLessonDetail(**item.model_dump(), scenario_ja=content.reflex.scenario_ja)

    async def evaluate(
        self,
        *,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        audio_file: UploadFile,
        response_start_ms: int,
    ) -> ReflexEvaluationResponse:
        try:
            if audio_file.content_type not in SUPPORTED_AUDIO_MIME_TYPES:
                raise ReflexInvalidAudioError()
            audio = await audio_file.read(MAX_AUDIO_SIZE_BYTES + 1)
            if not audio:
                raise ReflexInvalidAudioError()
            if len(audio) > MAX_AUDIO_SIZE_BYTES:
                raise ReflexAudioTooLargeError()

            content = await self.repository.get_published_lesson(content_id)
            if content is None or content.reflex is None:
                raise NotFoundError("Reflex lesson not found")

            transcript = await self.ai_gateway.transcribe(
                audio=audio,
                filename=audio_file.filename or "response.webm",
                language="ja",
                prompt_hint=content.reflex.prompt_ja,
            )
            evaluation = await self.ai_gateway.evaluate_reflex(
                question=content.reflex.prompt_ja,
                transcript=transcript.text,
            )
            score = max(0, min(100, round(evaluation.score)))
            is_on_time = response_start_ms <= content.reflex.response_start_limit_seconds * 1000
            interval_days = review_interval_days(score)
            completed_at = utc_now()

            try:
                await self.repository.lock_user(user_id)
                attempt_number = await self.repository.next_attempt_number(
                    user_id=user_id, content_id=content_id
                )
                attempt = await self.repository.create_completed_attempt(
                    user_id=user_id,
                    content_id=content_id,
                    attempt_number=attempt_number,
                    score=score,
                    started_at=completed_at - timedelta(milliseconds=response_start_ms),
                    response_started_at=completed_at,
                    is_on_time=is_on_time,
                    transcript=transcript.text,
                    completed_at=completed_at,
                )
                stored_evaluation = await self.repository.create_evaluation(
                    attempt_id=attempt.id,
                    score=score,
                    feedback=evaluation.feedback,
                    details={
                        "corrections": [item.model_dump() for item in evaluation.corrections],
                        "hints": evaluation.hints,
                        "is_acceptable": evaluation.is_acceptable,
                        "response_start_ms": response_start_ms,
                    },
                    completed_at=completed_at,
                )
                schedule = await self.repository.upsert_schedule(
                    user_id=user_id,
                    content_id=content_id,
                    due_at=completed_at + timedelta(days=interval_days),
                    interval_days=interval_days,
                    attempt_id=attempt.id,
                )
                award = await GamificationService(
                    GamificationRepository(self.repository.session)
                ).award_experience_in_transaction(
                    user_id=user_id,
                    attempt_id=attempt.id,
                    reward_amount=content.base_exp,
                )
                await self.repository.sync_completed_content_count(user_id)
                await self.repository.session.commit()
            except Exception:
                await self.repository.session.rollback()
                raise

            return ReflexEvaluationResponse(
                attempt_id=attempt.id,
                evaluation_id=stored_evaluation.id,
                transcript=transcript.text,
                score=score,
                is_on_time=is_on_time,
                feedback=evaluation.feedback,
                corrections=[item.model_dump() for item in evaluation.corrections],
                hints=evaluation.hints,
                earned_exp=award.amount if award.awarded else 0,
                review_due_at=schedule.due_at,
                review_interval_days=schedule.interval_days,
            )
        finally:
            await audio_file.close()

    async def list_schedules(
        self, *, user_id: uuid.UUID, is_due_only: bool
    ) -> list[ReviewScheduleItem]:
        rows = await self.repository.list_schedules(
            user_id=user_id, due_before=utc_now() if is_due_only else None
        )
        return [
            ReviewScheduleItem(
                content_id=schedule.content_id,
                title=title,
                due_at=schedule.due_at,
                interval_days=schedule.interval_days,
                ease_factor=float(schedule.ease_factor),
                repetitions=schedule.repetitions,
                last_attempt_id=schedule.last_attempt_id,
            )
            for schedule, title in rows
        ]

    @staticmethod
    def _lesson_item(content: LearningContent) -> ReflexLessonItem:
        if content.reflex is None:
            raise ValueError("Published Reflex content is missing its exercise extension")
        return ReflexLessonItem(
            id=content.id,
            title=content.title,
            description=content.short_description,
            topic=content.topic,
            difficulty=content.difficulty,
            audio_url=content.audio_url,
            prompt_ja=content.reflex.prompt_ja,
            response_start_limit_ms=content.reflex.response_start_limit_seconds * 1000,
        )
