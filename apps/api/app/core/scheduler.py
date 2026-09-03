"""Application-wide scheduled jobs (APScheduler)."""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core import settings
from app.core.database import async_session_factory
from app.repositories.leaderboard import LeaderboardRepository
from app.services.leaderboard import LeaderboardService
from app.utils.datetime_utils import utc_now, week_start_for

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def _rebuild_weekly_leaderboard() -> None:
    async with async_session_factory() as session:
        service = LeaderboardService(LeaderboardRepository(session))
        week_start = week_start_for(utc_now().date())
        count = await service.rebuild_week(week_start=week_start)
        logger.info("Rebuilt weekly leaderboard for %s: %d users", week_start, count)


def configure_scheduler() -> bool:
    if not settings.leaderboard_rebuild_enabled:
        logger.info("Weekly leaderboard rebuild is disabled")
        return False
    scheduler.add_job(
        _rebuild_weekly_leaderboard,
        trigger="interval",
        minutes=settings.leaderboard_rebuild_interval_minutes,
        next_run_time=utc_now(),
        id="rebuild_weekly_leaderboard",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    return True
