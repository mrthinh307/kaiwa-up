import uuid

from sqlalchemy import ColumnElement, func, select

from app.models.content import LearningContent
from app.models.enums import ContentStatus, ContentType, JlptLevel
from app.repositories.base import BaseRepository


class LearningContentRepository(BaseRepository):
    @staticmethod
    def _catalog_conditions(
        *,
        content_type: ContentType | None,
        difficulty: JlptLevel | None,
        topic: str | None,
    ) -> tuple[ColumnElement[bool], ...]:
        conditions: list[ColumnElement[bool]] = [LearningContent.status == ContentStatus.PUBLISHED]
        if content_type is not None:
            conditions.append(LearningContent.content_type == content_type)
        if difficulty is not None:
            conditions.append(LearningContent.difficulty == difficulty)
        if topic is not None:
            conditions.append(LearningContent.topic == topic)
        return tuple(conditions)

    async def list_published(
        self,
        *,
        content_type: ContentType | None,
        difficulty: JlptLevel | None,
        topic: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[LearningContent], int]:
        conditions = self._catalog_conditions(
            content_type=content_type,
            difficulty=difficulty,
            topic=topic,
        )
        total = (
            await self.session.scalar(
                select(func.count()).select_from(LearningContent).where(*conditions)
            )
            or 0
        )
        contents = list(
            (
                await self.session.scalars(
                    select(LearningContent)
                    .where(*conditions)
                    .order_by(
                        LearningContent.published_at.desc().nullslast(),
                        LearningContent.id.asc(),
                    )
                    .limit(limit)
                    .offset(offset)
                )
            ).all()
        )
        return contents, total

    async def get_published(self, content_id: uuid.UUID) -> LearningContent | None:
        content = await self.session.scalar(
            select(LearningContent).where(
                LearningContent.id == content_id,
                LearningContent.status == ContentStatus.PUBLISHED,
            )
        )
        return content

    async def get_by_slug(self, slug: str) -> LearningContent | None:
        content = await self.session.scalar(
            select(LearningContent).where(LearningContent.slug == slug)
        )
        return content

    async def get_for_update(self, content_id: uuid.UUID) -> LearningContent | None:
        contents = await self.session.scalars(
            select(LearningContent).where(LearningContent.id == content_id).with_for_update()
        )
        return contents.one_or_none()

    async def create(self, content: LearningContent) -> LearningContent:
        self.session.add(content)
        await self.session.flush()
        return content

    async def update(self, content: LearningContent) -> LearningContent:
        self.session.add(content)
        await self.session.flush()
        return content
