import math
import uuid

from pydantic import TypeAdapter
from sqlalchemy.exc import IntegrityError

from app.exceptions import (
    LearningContentAlreadyExistsError,
    LearningContentAlreadyPublishedError,
    LearningContentNotReadyError,
    NotFoundError,
)
from app.integrations.youtube import YouTubeTranscriptProvider
from app.models.content import LearningContent
from app.models.enums import ContentStatus, ContentType, JlptLevel
from app.repositories.learning_content import LearningContentRepository
from app.schemas.learning_content import (
    DictationContentDetail,
    DictationPromptSegment,
    LearningContentCreate,
    LearningContentCreateResponse,
    LearningContentDetail,
    LearningContentItem,
    ShadowingContentDetail,
    TranscriptSegment,
)
from app.schemas.pagination import PaginatedResponse
from app.utils.datetime_utils import utc_now

_TRANSCRIPT_ADAPTER = TypeAdapter(list[TranscriptSegment])


class LearningContentService:
    def __init__(
        self,
        repository: LearningContentRepository,
        transcript_provider: YouTubeTranscriptProvider | None = None,
    ) -> None:
        self.repository = repository
        self.transcript_provider = transcript_provider

    async def create_from_youtube(
        self,
        request: LearningContentCreate,
    ) -> LearningContentCreateResponse:
        if self.transcript_provider is None:
            raise RuntimeError("A transcript provider is required")
        transcript = await self.transcript_provider.fetch_japanese(str(request.youtube_url))
        slug = f"youtube-{transcript.video_id}"
        if await self.repository.get_by_slug(slug) is not None:
            raise LearningContentAlreadyExistsError()

        content = LearningContent(
            content_type=ContentType.SHADOWING_DICTATION,
            status=ContentStatus.DRAFT,
            slug=slug,
            title=request.title or f"YouTube {transcript.video_id}",
            short_description=request.description,
            topic=request.topic,
            difficulty=request.difficulty,
            audio_url=transcript.canonical_url,
            audio_duration_ms=max(segment.end_time_ms for segment in transcript.segments),
            transcript_ja=[segment.model_dump() for segment in transcript.segments],
            base_exp=request.base_exp,
        )
        try:
            await self.repository.create(content)
            await self.repository.session.commit()
            await self.repository.session.refresh(content)
        except IntegrityError as exc:
            await self.repository.session.rollback()
            raise LearningContentAlreadyExistsError() from exc

        return LearningContentCreateResponse(
            **self._to_detail(content).model_dump(),
            slug=content.slug,
            status=content.status,
            transcript=transcript.segments,
        )

    async def publish_content(
        self,
        content_id: uuid.UUID,
    ) -> LearningContentCreateResponse:
        content = await self.repository.get_for_update(content_id)
        if content is None:
            raise NotFoundError("Learning content not found")
        if content.status == ContentStatus.PUBLISHED:
            raise LearningContentAlreadyPublishedError()

        transcript = self._transcript(content)
        if (
            content.content_type != ContentType.SHADOWING_DICTATION
            or content.audio_url is None
            or content.audio_duration_ms is None
            or not transcript
        ):
            raise LearningContentNotReadyError(
                details={
                    "required_fields": [
                        "audio_url",
                        "audio_duration_ms",
                        "transcript_ja",
                    ]
                }
            )

        content.status = ContentStatus.PUBLISHED
        content.published_at = utc_now()
        await self.repository.update(content)
        await self.repository.session.commit()
        await self.repository.session.refresh(content)
        return LearningContentCreateResponse(
            **self._to_detail(content).model_dump(),
            slug=content.slug,
            status=content.status,
            transcript=transcript,
        )

    async def list_contents(
        self,
        *,
        content_type: ContentType | None,
        difficulty: JlptLevel | None,
        topic: str | None,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[LearningContentItem]:
        contents, total = await self.repository.list_published(
            content_type=content_type,
            difficulty=difficulty,
            topic=topic,
            limit=page_size,
            offset=(page - 1) * page_size,
        )
        return PaginatedResponse[LearningContentItem](
            items=[self._to_item(content) for content in contents],
            total_items=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    async def get_content(self, content_id: uuid.UUID) -> LearningContentDetail:
        return self._to_detail(await self._get_published(content_id))

    async def get_shadowing_content(self, content_id: uuid.UUID) -> ShadowingContentDetail:
        content = await self._get_listening_content(content_id)
        return ShadowingContentDetail(
            **self._to_detail(content).model_dump(),
            transcript=self._transcript(content),
        )

    async def get_dictation_content(self, content_id: uuid.UUID) -> DictationContentDetail:
        content = await self._get_listening_content(content_id)
        transcript = self._transcript(content)
        return DictationContentDetail(
            **self._to_detail(content).model_dump(),
            prompts=[
                DictationPromptSegment(
                    blank_index=index,
                    start_time_ms=segment.start_time_ms,
                    end_time_ms=segment.end_time_ms,
                    prompt=f"___ ({index})",
                )
                for index, segment in enumerate(transcript, start=1)
            ],
        )

    async def _get_published(self, content_id: uuid.UUID) -> LearningContent:
        content = await self.repository.get_published(content_id)
        if content is None:
            raise NotFoundError("Learning content not found")
        return content

    async def _get_listening_content(self, content_id: uuid.UUID) -> LearningContent:
        content = await self._get_published(content_id)
        if content.content_type != ContentType.SHADOWING_DICTATION:
            raise NotFoundError("Learning content not found")
        return content

    @staticmethod
    def _transcript(content: LearningContent) -> list[TranscriptSegment]:
        return _TRANSCRIPT_ADAPTER.validate_python(content.transcript_ja or [])

    @staticmethod
    def _duration_seconds(content: LearningContent) -> float | None:
        if content.audio_duration_ms is None:
            return None
        return content.audio_duration_ms / 1000

    @classmethod
    def _to_item(cls, content: LearningContent) -> LearningContentItem:
        return LearningContentItem(
            id=content.id,
            title=content.title,
            description=content.short_description,
            content_type=content.content_type,
            difficulty=content.difficulty,
            topic=content.topic,
            duration_seconds=cls._duration_seconds(content),
            audio_url=content.audio_url,
        )

    @classmethod
    def _to_detail(cls, content: LearningContent) -> LearningContentDetail:
        return LearningContentDetail(
            **cls._to_item(content).model_dump(),
            published_at=content.published_at,
        )
