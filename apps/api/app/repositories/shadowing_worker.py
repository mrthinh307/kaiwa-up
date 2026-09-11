"""Worker liveness is independent of whether a learner currently has queued work."""

import uuid
from datetime import timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert

from app.models.shadowing import ShadowingWorkerHeartbeat
from app.repositories.base import BaseRepository

SHADOWING_WORKER_HEARTBEAT_INTERVAL_SECONDS = 20.0
SHADOWING_WORKER_ONLINE_TTL_SECONDS = 60.0


class ShadowingWorkerRepository(BaseRepository):
    async def heartbeat(self, worker_id: uuid.UUID) -> None:
        await self.session.execute(
            insert(ShadowingWorkerHeartbeat)
            .values(worker_id=worker_id, heartbeat_at=func.clock_timestamp())
            .on_conflict_do_update(
                index_elements=[ShadowingWorkerHeartbeat.worker_id],
                set_={"heartbeat_at": func.clock_timestamp()},
            )
        )

    async def is_online(self, ttl_seconds: float = SHADOWING_WORKER_ONLINE_TTL_SECONDS) -> bool:
        worker_id = await self.session.scalar(
            select(ShadowingWorkerHeartbeat.worker_id)
            .where(
                ShadowingWorkerHeartbeat.heartbeat_at
                >= func.clock_timestamp() - timedelta(seconds=ttl_seconds)
            )
            .limit(1)
        )
        return worker_id is not None

    async def forget(self, worker_id: uuid.UUID) -> None:
        await self.session.execute(
            delete(ShadowingWorkerHeartbeat).where(ShadowingWorkerHeartbeat.worker_id == worker_id)
        )
