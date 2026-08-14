import uuid
from datetime import UTC, date, datetime, timedelta

from app.models.gamification import WeeklyLeaderboardEntry
from app.repositories.leaderboard import LeaderboardRepository, LeaderboardRow
from app.schemas.leaderboard import (
    LeaderboardUser,
    WeeklyLeaderboardData,
)


class LeaderboardService:
    def __init__(self, repository: LeaderboardRepository) -> None:
        self.repository = repository

    async def rebuild_week(self, *, week_start: date) -> int:
        """Tổng hợp EXP từ ledger, gán rank, thay snapshot tuần. Idempotent."""
        week_end = week_start + timedelta(days=7)
        rows = await self.repository.aggregate_weekly_exp(
            week_start=_to_utc(week_start),
            week_end=_to_utc(week_end),
        )

        entries = [
            WeeklyLeaderboardEntry(
                week_start=week_start,
                user_id=row.user_id,
                weekly_exp=row.weekly_exp,
                rank=rank,  # rows đã sắp weekly_exp DESC, user_id ASC
            )
            for rank, row in enumerate(rows, start=1)
        ]

        await self.repository.replace_week_snapshot(
            week_start=week_start,
            entries=entries,
        )
        await self.repository.session.commit()  # service sở hữu transaction
        return len(entries)

    async def get_weekly(
        self,
        *,
        user_id: uuid.UUID,
        week_start: date,
        limit: int,
    ) -> WeeklyLeaderboardData:
        rankings = await self.repository.get_week_rankings(
            week_start=week_start,
            limit=limit,
        )
        user_entry = await self.repository.get_user_entry(
            week_start=week_start,
            user_id=user_id,
        )

        return WeeklyLeaderboardData(
            week_start=week_start,
            user_rank=(_to_user(user_entry) if user_entry is not None else None),
            rankings=[_to_user(row) for row in rankings],
        )


def _to_utc(day: date) -> datetime:
    return datetime.combine(day, datetime.min.time(), tzinfo=UTC)


def _to_user(row: LeaderboardRow) -> LeaderboardUser:
    return LeaderboardUser(
        rank=row.rank,
        user_id=row.user_id,
        display_name=row.display_name,
        avatar_url=row.avatar_url,
        weekly_exp=row.weekly_exp,
    )
