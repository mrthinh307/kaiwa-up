from datetime import date, datetime
from typing import NamedTuple
from uuid import UUID

from sqlalchemy import delete, func, select

from app.models.gamification import WeeklyLeaderboardEntry, XpTransaction
from app.models.user import User
from app.repositories.base import BaseRepository


class WeeklyExpAggregateRow(NamedTuple):
    user_id: UUID
    display_name: str | None
    weekly_exp: int


class LeaderboardRow(NamedTuple):
    rank: int
    user_id: UUID
    display_name: str | None
    avatar_url: str | None
    weekly_exp: int


class LeaderboardRepository(BaseRepository):
    async def aggregate_weekly_exp(
        self,
        *,
        week_start: datetime,
        week_end: datetime,
    ) -> list[WeeklyExpAggregateRow]:
        """Tổng EXP của từng user trong [week_start, week_end).

        Sắp weekly_exp DESC rồi user_id ASC — rank rule deterministic ở docs.
        """
        results = (
            await self.session.execute(
                select(
                    XpTransaction.user_id,
                    User.display_name,
                    func.sum(XpTransaction.amount).label("weekly_exp"),
                )
                .join(User, User.id == XpTransaction.user_id)
                .where(
                    XpTransaction.created_at >= week_start,
                    XpTransaction.created_at < week_end,
                )
                .group_by(XpTransaction.user_id, User.display_name)
                .order_by(
                    func.sum(XpTransaction.amount).desc(),
                    XpTransaction.user_id.asc(),
                )
            )
        ).all()

        return [
            WeeklyExpAggregateRow(
                user_id=row.user_id,
                display_name=row.display_name,
                weekly_exp=int(row.weekly_exp),
            )
            for row in results
        ]

    async def replace_week_snapshot(
        self,
        *,
        week_start: date,
        entries: list[WeeklyLeaderboardEntry],
    ) -> None:
        """Xóa snapshot cũ của tuần rồi insert bản mới => rebuild idempotent."""
        await self.session.execute(
            delete(WeeklyLeaderboardEntry).where(WeeklyLeaderboardEntry.week_start == week_start)
        )
        if entries:
            self.session.add_all(entries)
        await self.session.flush()

    async def get_week_rankings(
        self,
        *,
        week_start: date,
        limit: int,
    ) -> list[LeaderboardRow]:
        results = (
            await self.session.execute(
                select(
                    WeeklyLeaderboardEntry.rank,
                    WeeklyLeaderboardEntry.user_id,
                    User.display_name,
                    User.avatar_url,
                    WeeklyLeaderboardEntry.weekly_exp,
                )
                .join(User, User.id == WeeklyLeaderboardEntry.user_id)
                .where(WeeklyLeaderboardEntry.week_start == week_start)
                .order_by(WeeklyLeaderboardEntry.rank.asc())
                .limit(limit)
            )
        ).all()

        return [
            LeaderboardRow(
                rank=row.rank,
                user_id=row.user_id,
                display_name=row.display_name,
                avatar_url=row.avatar_url,
                weekly_exp=row.weekly_exp,
            )
            for row in results
        ]

    async def get_user_entry(
        self,
        *,
        week_start: date,
        user_id: UUID,
    ) -> LeaderboardRow | None:
        result = (
            await self.session.execute(
                select(
                    WeeklyLeaderboardEntry.rank,
                    WeeklyLeaderboardEntry.user_id,
                    User.display_name,
                    User.avatar_url,
                    WeeklyLeaderboardEntry.weekly_exp,
                )
                .join(User, User.id == WeeklyLeaderboardEntry.user_id)
                .where(
                    WeeklyLeaderboardEntry.week_start == week_start,
                    WeeklyLeaderboardEntry.user_id == user_id,
                )
            )
        ).first()

        if result is None:
            return None
        return LeaderboardRow(
            rank=result.rank,
            user_id=result.user_id,
            display_name=result.display_name,
            avatar_url=result.avatar_url,
            weekly_exp=result.weekly_exp,
        )
