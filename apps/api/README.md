# Kaiwa App API

FastAPI backend managed with `uv` and organized using a layered architecture.

## Setup

1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Fill in `DATABASE_URL` for local development.
3. Add `DATABASE_URL_TEST` for the Neon test branch used by CI and local tests.
4. Install Python dependencies:

```bash
cd apps/api
uv sync
```

## Development

Start the API server locally:

```bash
cd apps/api
uv run uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`, OpenAPI docs at
`http://localhost:8000/docs`, health at `http://localhost:8000/api/v1/health`, and
readiness at `http://localhost:8000/api/v1/ready`.

## Testing

Test uses a dedicated Neon test branch, not the development or production database.

1. Copy `apps/api/.env.example` → `apps/api/.env`, then fill in `DATABASE_URL_TEST`.
2. Run migration on the test branch:

```bash
make migrate-api-test
```

3. Run tests:

```bash
make test-api
```

Each test runs in its own transaction and automatically rolls back after completion.
Test data is never persisted, so it is safe for concurrent local or CI execution.

## CI

Pull requests automatically run the repository CI pipeline.

The backend CI job executes:

- `uv sync`
- `uv run ruff check .`
- `uv run ruff format --check .`
- `uv run mypy`
- `DATABASE_URL=$DATABASE_URL_TEST uv run alembic upgrade head`
- `uv run --env-file .env pytest`

The frontend CI job executes:

- `pnpm install --frozen-lockfile`
- `pnpm lint:web`
- `pnpm --filter web typecheck`
- `pnpm format:check`

See `.github/workflows/ci.yml` for the exact CI configuration.
