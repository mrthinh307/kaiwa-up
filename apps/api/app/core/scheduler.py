"""Application-wide scheduled jobs (APScheduler)."""

import logging
from datetime import date

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core import settings
from app.core.database import async_session_factory
from app.repositories.leaderboard import LeaderboardRepository
from app.services.leaderboard import LeaderboardService
from app.utils.datetime_utils import week_start_for

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def _rebuild_weekly_leaderboard() -> None:
    async with async_session_factory() as session:
        service = LeaderboardService(LeaderboardRepository(session))
        week_start = week_start_for(date.today())
        count = await service.rebuild_week(week_start=week_start)
        logger.info("Rebuilt weekly leaderboard for %s: %d users", week_start, count)


def configure_scheduler() -> None:
    if not settings.leaderboard_rebuild_enabled:
        logger.info("Weekly leaderboard rebuild is disabled")
        return
    scheduler.add_job(
        _rebuild_weekly_leaderboard,
        trigger="interval",
        hours=settings.leaderboard_rebuild_interval_hours,
        id="rebuild_weekly_leaderboard",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
