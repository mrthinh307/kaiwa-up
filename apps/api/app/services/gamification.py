import uuid
from typing import NamedTuple

from sqlalchemy.exc import IntegrityError

from app.exceptions.gamification import AttemptForbiddenError, AttemptNotFoundError
from app.models.enums import AttemptStatus, ContentType
from app.repositories.gamification import GamificationRepository
from app.schemas.gamification import ExpHistoryItem, GamificationProfileResponse
from app.services.leveling import level_for_total_exp, minimum_exp_for_level

XP_TRANSACTION_REASON_MAX_LENGTH = 100


class XpAwardResult(NamedTuple):
    awarded: bool
    amount: int
    total_exp: int
    level: int


class GamificationService:
    def __init__(self, repository: GamificationRepository) -> None:
        self.repository = repository

    async def award_experience(
        self,
        *,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
    ) -> XpAwardResult:
        try:
            result = await self.award_experience_in_transaction(
                user_id=user_id,
                attempt_id=attempt_id,
            )
            await self.repository.session.commit()
        except IntegrityError:
            await self.repository.session.rollback()
            refreshed = await self.repository.get_or_create_user_progress(user_id)
            return XpAwardResult(
                awarded=False,
                amount=0,
                total_exp=refreshed.total_exp,
                level=refreshed.current_level,
            )
        return result

    async def award_experience_in_transaction(
        self,
        *,
        user_id: uuid.UUID,
        attempt_id: uuid.UUID,
        reward_amount: int | None = None,
    ) -> XpAwardResult:
        """Award EXP without committing so a parent use case can own the transaction."""

        attempt = await self.repository.get_attempt_for_reward(attempt_id)
        if attempt is None:
            raise AttemptNotFoundError()
        if attempt.user_id != user_id:
            raise AttemptForbiddenError()

        if attempt.status != AttemptStatus.COMPLETED:
            progress = await self.repository.get_or_create_user_progress(user_id)
            return XpAwardResult(
                awarded=False,
                amount=0,
                total_exp=progress.total_exp,
                level=progress.current_level,
            )
        progress = await self.repository.get_or_create_user_progress_for_update(user_id)
        if await self.repository.find_transaction_by_attempt(attempt_id) is not None:
            return XpAwardResult(
                awarded=False,
                amount=0,
                total_exp=progress.total_exp,
                level=progress.current_level,
            )

        amount = reward_amount if reward_amount is not None else attempt.base_exp
        if amount <= 0:
            raise ValueError("EXP reward amount must be positive")
        reason = self._build_reason(attempt.content_type, attempt.content_title)
        await self.repository.insert_transaction(
            user_id=user_id,
            attempt_id=attempt_id,
            amount=amount,
            reason=reason,
        )
        progress.total_exp += amount
        progress.current_level = level_for_total_exp(progress.total_exp)

        return XpAwardResult(
            awarded=True,
            amount=amount,
            total_exp=progress.total_exp,
            level=progress.current_level,
        )

    async def get_profile(
        self,
        user_id: uuid.UUID,
        *,
        recent_limit: int,
    ) -> GamificationProfileResponse:
        progress = await self.repository.get_or_create_user_progress(user_id)
        current_level = level_for_total_exp(progress.total_exp)
        current_level_min_exp = minimum_exp_for_level(current_level)
        next_level_min_exp = minimum_exp_for_level(current_level + 1)
        history = await self.repository.get_recent_transactions(user_id, recent_limit)

        return GamificationProfileResponse(
            level=current_level,
            level_title=f"Level {current_level}",
            total_exp=progress.total_exp,
            current_level_min_exp=current_level_min_exp,
            next_level_min_exp=next_level_min_exp,
            exp_to_next_level=next_level_min_exp - progress.total_exp,
            recent_exp_history=[
                ExpHistoryItem(
                    id=transaction.id,
                    attempt_id=transaction.attempt_id,
                    amount=transaction.amount,
                    reason=transaction.reason,
                    created_at=transaction.created_at,
                )
                for transaction in history
            ],
        )

    @staticmethod
    def _build_reason(content_type: ContentType, content_title: str) -> str:
        display_name = content_type.value.replace("_", " ").title()
        reason = f"Hoàn thành {display_name}: {content_title}"
        return reason[:XP_TRANSACTION_REASON_MAX_LENGTH]
