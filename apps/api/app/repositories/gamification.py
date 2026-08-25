from typing import NamedTuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from app.models.attempt import ExerciseAttempt
from app.models.content import LearningContent
from app.models.enums import AttemptStatus, ContentType
from app.models.gamification import XpTransaction
from app.models.user import UserProgress
from app.repositories.base import BaseRepository


class RewardAttemptRow(NamedTuple):
    user_id: UUID
    status: AttemptStatus
    content_type: ContentType
    content_title: str
    base_exp: int


class GamificationRepository(BaseRepository):
    async def get_attempt_for_reward(self, attempt_id: UUID) -> RewardAttemptRow | None:
        result = (
            await self.session.execute(
                select(
                    ExerciseAttempt.user_id,
                    ExerciseAttempt.status,
                    LearningContent.content_type,
                    LearningContent.title,
                    LearningContent.base_exp,
                )
                .join(LearningContent, LearningContent.id == ExerciseAttempt.content_id)
                .where(ExerciseAttempt.id == attempt_id)
            )
        ).first()
        if result is None:
            return None
        return RewardAttemptRow(
            user_id=result.user_id,
            status=result.status,
            content_type=result.content_type,
            content_title=result.title,
            base_exp=result.base_exp,
        )

    async def find_transaction_by_attempt(self, attempt_id: UUID) -> XpTransaction | None:
        return (
            (
                await self.session.execute(
                    select(XpTransaction).where(XpTransaction.attempt_id == attempt_id)
                )
            )
            .scalars()
            .first()
        )

    async def insert_transaction(
        self,
        *,
        user_id: UUID,
        attempt_id: UUID,
        amount: int,
        reason: str,
    ) -> XpTransaction:
        transaction = XpTransaction(
            user_id=user_id,
            attempt_id=attempt_id,
            amount=amount,
            reason=reason,
        )
        self.session.add(transaction)
        await self.session.flush()
        return transaction

    async def get_or_create_user_progress(self, user_id: UUID) -> UserProgress:
        progress = (
            (
                await self.session.execute(
                    select(UserProgress).where(UserProgress.user_id == user_id)
                )
            )
            .scalars()
            .first()
        )
        if progress is None:
            progress = UserProgress(user_id=user_id)
            self.session.add(progress)
            await self.session.flush()
        return progress

    async def get_or_create_user_progress_for_update(self, user_id: UUID) -> UserProgress:
        await self.session.execute(
            insert(UserProgress)
            .values(user_id=user_id, total_exp=0, current_level=1, completed_content_count=0)
            .on_conflict_do_nothing(index_elements=[UserProgress.user_id])
        )
        progress = (
            (
                await self.session.execute(
                    select(UserProgress).where(UserProgress.user_id == user_id).with_for_update()
                )
            )
            .scalars()
            .one()
        )
        return progress

    async def get_recent_transactions(
        self,
        user_id: UUID,
        limit: int,
    ) -> list[XpTransaction]:
        results = (
            (
                await self.session.execute(
                    select(XpTransaction)
                    .where(XpTransaction.user_id == user_id)
                    .order_by(XpTransaction.created_at.desc(), XpTransaction.id.desc())
                    .limit(limit)
                )
            )
            .scalars()
            .all()
        )
        return list(results)

    async def count_transactions(self, user_id: UUID) -> int:
        return (
            await self.session.scalar(
                select(func.count())
                .select_from(XpTransaction)
                .where(XpTransaction.user_id == user_id)
            )
            or 0
        )
