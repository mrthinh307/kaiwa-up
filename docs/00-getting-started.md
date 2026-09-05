# Getting Started

## Prerequisites

Install the following tools before setting up the project:

- [Node.js](https://nodejs.org/) 20 or newer
- [pnpm](https://pnpm.io/) 10 or newer
- [Python](https://www.python.org/) 3.12 or 3.13
- [uv](https://docs.astral.sh/uv/)
- [PostgreSQL](https://www.postgresql.org/) for database-backed features
- [GNU Make](https://www.gnu.org/software/make/) (optional, but recommended)

The repository pins pnpm `10.32.1`. If Corepack is available, enable it and activate the expected version:

```bash
corepack enable
corepack prepare pnpm@10.32.1 --activate
```

Verify the main tools:

```bash
node --version
pnpm --version
python --version
uv --version
make --version
```

`make` is not included with Windows by default. Install GNU Make through MinGW, Chocolatey, Scoop, or use WSL. You can also follow the manual commands below without installing Make.

## Install dependencies

From the repository root, install both frontend and backend dependencies:

```bash
make install
```

The command runs:

```bash
pnpm install
cd apps/api && uv sync
```

Without Make, run those two commands manually from the repository root.

## Start the development stack

Start the Next.js frontend and FastAPI backend together:

```bash
make dev
```

For separate logs and process control, run each application in its own terminal:

```bash
make dev-web
```

```bash
make dev-api
```

Without Make, use:

```bash
pnpm dev:web
```

```bash
cd apps/api
uv run uvicorn app.main:app --reload
```

Once started, the applications are available at:

- Web application: `http://localhost:3000`
- API: `http://localhost:8000`
- OpenAPI documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/v1/health`

The health endpoint should return:

```json
{
  "status": "ok",
  "timestamp": "2026-08-06T14:30:00.000Z",
  "app_name": "Kaiwa App API",
  "release_sha": "local"
}
```

## Common commands

List all Make targets:

```bash
make help
```

| Make command         | Without Make                                                                                       | Description                                      |
| -------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `make install`       | `pnpm install`, then `cd apps/api && uv sync`                                                      | Install web and API dependencies                 |
| `make dev`           | Run `pnpm dev:web` and `cd apps/api && uv run uvicorn app.main:app --reload` in separate terminals | Start the web and API development servers        |
| `make lint`          | `pnpm lint:web`, then `cd apps/api && uv run ruff check .`                                         | Lint both applications                           |
| `make typecheck`     | `pnpm --filter web typecheck`, then `cd apps/api && uv run mypy`                                   | Type-check both applications                     |
| `make install-web`   | `pnpm install`                                                                                     | Install JavaScript dependencies                  |
| `make dev-web`       | `pnpm dev:web`                                                                                     | Start only the Next.js development server        |
| `make build-web`     | `pnpm build:web`                                                                                   | Create a production build of the web application |
| `make lint-web`      | `pnpm lint:web`                                                                                    | Lint the web application                         |
| `make typecheck-web` | `pnpm --filter web typecheck`                                                                      | Type-check the web application                   |
| `make install-api`   | `cd apps/api && uv sync`                                                                           | Install Python dependencies                      |
| `make dev-api`       | `cd apps/api && uv run uvicorn app.main:app --reload`                                              | Start only the FastAPI development server        |
| `make lint-api`      | `cd apps/api && uv run ruff check .`                                                               | Lint the API                                     |
| `make typecheck-api` | `cd apps/api && uv run mypy`                                                                       | Type-check the API                               |
| `make test-api`      | `cd apps/api && uv run pytest`                                                                     | Run the API test suite                           |

Format all supported workspace files with Prettier:

```bash
pnpm format
```

Check formatting without modifying files:

```bash
pnpm format:check
```

## Backend workflow

For API development and testing, the repository exposes commands that keep the backend migration and test flow separate from development and production data.

1. Install API dependencies:

   ```bash
   make install-api
   ```

2. Set up an isolated test database:

   - Copy `apps/api/.env.example` to `apps/api/.env`
   - Add `DATABASE_URL_TEST` pointing to an isolated PostgreSQL database. A Neon test branch can be used for local smoke, migration, and production-like verification.

3. Apply migrations to the test database:

   ```bash
   make migrate-api-test
   ```

4. Run the API backend test suite:

   ```bash
   make test-api
   ```

The API tests use `DATABASE_URL_TEST`. Each test runs in its own transaction and rolls back after completion, so test data is not persisted.

Pull-request CI starts a disposable PostgreSQL 18 service on the GitHub Actions runner, applies all Alembic migrations, and runs pytest with four parallel workers. The database is isolated per CI job and removed automatically when the job finishes, so pull requests do not use the shared Neon test branch or require its connection secret.

## API client generation

The `@kaiwa-app/api-client` workspace package hosts auto-generated TypeScript models and client functions created directly from the FastAPI OpenAPI 3.1.0 schema using `@hey-api/openapi-ts`.

To generate or update the API client:

```bash
make generate-api-client
# or
pnpm generate:api-client
```

This extracts the deterministic OpenAPI schema from FastAPI (`apps/api`), saves `packages/api-client/openapi.json`, and updates `@kaiwa-app/api-client` with typed SDK functions.

To check if generated artifacts are synchronized with the FastAPI backend:

```bash
pnpm check:api-client
```

For local development, `NEXT_PUBLIC_API_BASE_URL` may point browser requests directly to FastAPI. Production uses the server-only `API_BASE_URL`; Next.js rewrites same-origin `/api/*` requests to FastAPI so backend credentials are never exposed through `NEXT_PUBLIC_*`:

```dotenv
# apps/web/.env.local
API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```
