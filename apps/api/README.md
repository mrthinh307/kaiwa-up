# Kaiwa App API

FastAPI backend managed with `uv` and organized using a layered architecture.

## Setup

1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Fill in `DATABASE_URL` for local development.
3. Add `DATABASE_URL_TEST` for an isolated PostgreSQL database used by local tests. A Neon test
   branch can be kept for smoke, migration, and production-like verification.
4. Install Python dependencies:

```bash
cd apps/api
uv sync
```

## Development

Start the API server locally:

```bash
cd apps/api
uv run python -m uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`, OpenAPI docs at
`http://localhost:8000/docs`, health at `http://localhost:8000/api/v1/health`, and
readiness at `http://localhost:8000/api/v1/ready`.

### Shadowing worker (development only)

Shadowing needs a separate worker process; starting the API does not start it. In a second
terminal, from the repository root:

```bash
cd apps/api
uv run python -m app.workers.shadowing
```

Alternatively, run `make dev-shadowing-worker` from the repository root, not from `apps/api`.
Use one worker for local development. API and worker must load the same development
`DATABASE_URL` and storage settings. With local storage, run both from `apps/api` so their
relative `STORAGE_DIR` resolves to the same directory. With Cloudinary, use the same account
and folder configuration. Do not share the application database with tests.

Install ffmpeg (which includes ffprobe) before recording compressed browser audio. On Windows:

```powershell
scoop install ffmpeg
ffprobe -version
```

Restart the API terminal after installation so it inherits the new PATH, or set
`SHADOWING_FFPROBE_PATH` to the executable's absolute path. Migration and worker startup cannot
fix a missing audio-inspection executable.

The local lifecycle is:

1. Upload stores a recording and its validated duration; it does not enqueue STT yet.
2. Submit freezes completion and EXP and queues STT. It does not wait for an AI provider.
3. The worker processes recordings and the result page polls each segment's transcription state.
4. Overall AI feedback is queued only when requested on the result page; it uses the stored
   transcripts, not another STT pass. Neither STT nor AI changes the awarded completion/EXP.

See `.env.example` for worker concurrency and timeout defaults. Heartbeat and execution deadline
must both be shorter than the lease. Jobs interrupted by a forced stop remain leased until expiry;
the restarted worker recovers expired jobs within their retry budget. The worker also writes
liveness to `shadowing_worker_heartbeats`, including while idle. An idle terminal without output
does not by itself indicate a failure. Check result progress and safe error codes before retrying.
Do not delete jobs or resubmit solely to recover a worker interruption.

Keep recording audio available for result replay and STT retry. Missing or expired audio cannot
be recovered by restarting the worker. `fake` providers are suitable for plumbing tests only:
their output is not a real assessment of the learner's audio. Configuring real providers may
incur charges. This setup does not configure or deploy any cloud service.

## Testing

Tests use a dedicated PostgreSQL database, not the development or production database.

1. Copy `apps/api/.env.example` → `apps/api/.env`, then fill in `DATABASE_URL_TEST`.
2. Run migration on the test database:

```bash
make migrate-api-test
```

3. Run tests:

```bash
make test-api
```

Each test runs in its own transaction and automatically rolls back after completion.
Test data is never persisted, so it is safe for concurrent local or CI execution.

Pull-request CI does not connect to Neon. It starts a disposable PostgreSQL 18 service, applies the
migrations, and runs the suite with four pytest-xdist workers. The service database is isolated per
job and removed automatically after CI completes.

## CI

Pull requests automatically run the repository CI pipeline.

The backend CI job executes:

- `uv sync --locked`
- `uv run ruff check .`
- `uv run ruff format --check .`
- `uv run mypy`
- `uv run alembic upgrade head` against the disposable PostgreSQL service
- `uv run pytest -n 4 --dist loadfile --durations=20`

The frontend CI job executes:

- `pnpm install --frozen-lockfile`
- `pnpm lint:web`
- `pnpm --filter web typecheck`
- `pnpm format:check`

See `.github/workflows/ci.yml` for the exact CI configuration.
