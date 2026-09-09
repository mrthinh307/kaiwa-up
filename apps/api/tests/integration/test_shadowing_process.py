"""Three real uploads, a separate worker process, forced restart, and opt-in AI.

Only the provider is fake. The worker entrypoint, media inspection/local storage, HTTP routes,
SQL commits, leases, and polling use their real implementations in an isolated TEST schema.
"""

import asyncio
import os
import subprocess
import sys
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from pathlib import Path

import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.models.attempt import Recording
from app.models.gamification import XpTransaction
from app.models.shadowing import ShadowingJob
from tests.conftest import DATABASE_URL_TEST, isolated_shadowing_sessions
from tests.integration.test_shadowing_submission import prepare_submission, submission_client
from tests.unit.test_shadowing_audio import wav_audio

# Bootstrap only directs the normal entrypoint to the disposable schema and adds latency at
# the fake provider boundary so the test can terminate a worker with an in-flight lease.
WORKER_BOOTSTRAP = """
import asyncio
import runpy
import sys
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.core import database, settings
from app.integrations.ai.providers.fake import FakeAiGateway

schema, delay = sys.argv[1], float(sys.argv[2])
assert schema.startswith('shadowing_test_') and schema.isidentifier()
database.engine = create_async_engine(
    settings.database_url, poolclass=NullPool,
    execution_options={'schema_translate_map': {None: schema}},
)
database.async_session_factory = async_sessionmaker(database.engine, expire_on_commit=False)
original_transcribe = FakeAiGateway.transcribe
async def transcribe(self, **kwargs):
    await asyncio.sleep(delay)
    return await original_transcribe(self, **kwargs)
FakeAiGateway.transcribe = transcribe
runpy.run_module('app.workers.shadowing', run_name='__main__')
"""


@asynccontextmanager
async def worker_process(
    schema: str, storage_dir: Path, *, delay: float = 0
) -> AsyncIterator[subprocess.Popen]:
    env = {
        **os.environ,
        "DATABASE_URL": DATABASE_URL_TEST,
        "ENVIRONMENT": "test",
        "STORAGE_DIR": str(storage_dir),
        "AI_STT_PROVIDER": "fake",
        "AI_EVAL_PROVIDER": "fake",
        "AI_STT_FALLBACK_PROVIDERS": "",
        "AI_EVAL_FALLBACK_PROVIDERS": "",
        "CLOUDINARY_URL": "",
        "CLOUDINARY_CLOUD_NAME": "",
        "CLOUDINARY_API_KEY": "",
        "CLOUDINARY_API_SECRET": "",
        "SHADOWING_STT_CONCURRENCY": "1",
        "SHADOWING_ATTEMPT_STT_CONCURRENCY": "1",
        "SHADOWING_JOB_LEASE_SECONDS": "10",
        "SHADOWING_JOB_HEARTBEAT_SECONDS": "1",
        "SHADOWING_JOB_DEADLINE_SECONDS": "8",
    }
    process = subprocess.Popen(
        [sys.executable, "-c", WORKER_BOOTSTRAP, schema, str(delay)],
        cwd=Path(__file__).resolve().parents[2],
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    try:
        yield process
    finally:
        if process.poll() is None:
            process.terminate()
        try:
            await asyncio.to_thread(process.wait, timeout=15)
        except subprocess.TimeoutExpired:
            process.kill()
            await asyncio.to_thread(process.wait, timeout=15)


async def wait_for_state(
    read: Callable[[], Awaitable[dict]],
    predicate: Callable[[dict], bool],
    process: subprocess.Popen,
) -> dict:
    async with asyncio.timeout(90):
        while True:
            assert process.poll() is None, "Worker process exited before publishing results"
            state = await read()
            if predicate(state):
                return state
            await asyncio.sleep(0.5)


async def test_three_segment_worker_process_recovers_lease_and_preserves_reward(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(settings, "STORAGE_DIR", str(tmp_path))
    for key in (
        "CLOUDINARY_URL",
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
    ):
        monkeypatch.setattr(settings, key, None)
    async with isolated_shadowing_sessions() as factory:
        example = await prepare_submission(factory, count=3, recorded=0)
        engine = factory.kw["bind"]
        schema = engine.get_execution_options()["schema_translate_map"][None]
        async with submission_client(factory, example) as client:
            recordings: list[str] = []
            for index in range(3):
                form = {
                    "attempt_id": str(example.attempt.id),
                    "segment_id": str(index),
                    "client_recording_id": str(uuid.uuid4()),
                }
                upload_path = f"/api/v1/shadowing/{example.content.id}/record-segment"
                audio = {"audio_file": ("take.wav", wav_audio(2100), "audio/wav")}
                response = await client.post(upload_path, data=form, files=audio)
                assert response.status_code == 201
                recordings.append(response.json()["recording_id"])
                replay = await client.post(upload_path, data=form, files=audio)
                assert replay.status_code == 201
                assert replay.json()["recording_id"] == recordings[-1]

            submit_path = f"/api/v1/shadowing/{example.content.id}/submit"
            manifest = [
                {"segment_index": index, "recording_id": recording_id}
                for index, recording_id in enumerate(recordings)
            ]
            submit = await client.post(
                submit_path,
                json={"attempt_id": str(example.attempt.id), "recordings": manifest},
            )
            assert submit.status_code == 200
            assert submit.json()["transcription"]["queued"] == 3
            assert submit.json()["xp_earned"] == 50
            assert submit.json()["ai_review"]["status"] == "not_requested"
            path = f"/api/v1/shadowing/attempts/{example.attempt.id}"

            async def read_review() -> dict:
                response = await client.get(f"{path}/review")
                assert response.status_code == 200
                return response.json()

            # Terminate only the test-owned child; the in-flight job must be recovered using
            # its actual ten-second lease, without manually changing any database timestamp.
            async with worker_process(schema, tmp_path, delay=6) as first:
                processing = await wait_for_state(
                    read_review, lambda state: state["transcription"]["processing"] == 1, first
                )
                assert processing["transcription"]["is_delayed"] is False

            async with worker_process(schema, tmp_path) as restarted:
                done = await wait_for_state(
                    read_review, lambda state: state["transcription"]["completed"] == 3, restarted
                )
                assert all(segment["user_transcript"] for segment in done["segments"])
                assert done["ai_review"]["status"] == "not_requested"
                requested = await client.post(
                    f"{path}/ai-reviews", json={"review_revision": done["review_revision"]}
                )
                assert requested.status_code == 202
                reviewed = await wait_for_state(
                    read_review,
                    lambda state: state["ai_review"]["status"] == "completed",
                    restarted,
                )
                assert reviewed["score"] == 100 and reviewed["earned_exp"] == 50
                replayed = await client.post(
                    f"{path}/ai-reviews", json={"review_revision": reviewed["review_revision"]}
                )
                assert replayed.status_code == 200
                assert replayed.json()["queued_jobs"] == 0
                repeated = await client.post(
                    submit_path, json={"attempt_id": str(example.attempt.id)}
                )
                assert repeated.status_code == 200 and repeated.json()["xp_earned"] == 50

            async with factory() as session:
                jobs = list(await session.scalars(select(ShadowingJob)))
                stt_jobs = [job for job in jobs if job.kind == "transcribe_recording"]
                assert len(stt_jobs) == 3 and all(job.status == "completed" for job in stt_jobs)
                assert any(job.attempt_count == 2 for job in stt_jobs)
                assert sum(job.kind == "evaluate_batch" for job in jobs) == 1
                assert await session.scalar(select(func.count()).select_from(Recording)) == 3
                assert await session.scalar(select(func.count()).select_from(XpTransaction)) == 1
