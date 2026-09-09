import uuid
from datetime import timedelta

from sqlalchemy import func, update

from app.models.shadowing import ShadowingWorkerHeartbeat
from app.repositories.shadowing_worker import ShadowingWorkerRepository
from tests.conftest import isolated_shadowing_sessions


async def test_worker_liveness_uses_database_clock_and_forgets_only_its_own_process() -> None:
    async with isolated_shadowing_sessions() as factory:
        first, second = uuid.uuid4(), uuid.uuid4()
        async with factory() as session:
            repository = ShadowingWorkerRepository(session)
            assert not await repository.is_online()
            await repository.heartbeat(first)
            await repository.heartbeat(second)
            await session.commit()
        async with factory() as session:
            repository = ShadowingWorkerRepository(session)
            assert await repository.is_online()
            await repository.forget(first)
            assert await repository.is_online()
            await session.execute(
                update(ShadowingWorkerHeartbeat)
                .where(ShadowingWorkerHeartbeat.worker_id == second)
                .values(heartbeat_at=func.clock_timestamp() - timedelta(minutes=5))
            )
            await session.commit()
        async with factory() as session:
            assert not await ShadowingWorkerRepository(session).is_online()
