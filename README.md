# Kaiwa App

Kaiwa App is a monorepo for a Japanese listening and speaking practice platform. It combines a Next.js frontend with a FastAPI backend and is designed to support interactive exercises such as shadowing, dictation, quick-response practice, gamification, and AI-assisted conversation.

## Tech stack

- Next.js 16, React 19, TypeScript, and Tailwind CSS
- FastAPI, SQLAlchemy, Alembic, and PostgreSQL
- pnpm workspaces for JavaScript packages
- uv for Python dependency and environment management
- GNU Make for convenient development commands

## Getting started

### Prerequisites

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

### 1. Install dependencies

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

### 2. Start the development stack

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
  "app_name": "Kaiwa App API"
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

2. Set up the test database branch:

- Copy `apps/api/.env.example` to `apps/api/.env`
- Add `DATABASE_URL_TEST` pointing to a Neon test branch

3. Apply migrations to the Neon test database branch:

```bash
make migrate-api-test
```

4. Run the API backend test suite:

```bash
make test-api
```

The API tests use `DATABASE_URL_TEST` and are intended to run against an isolated Neon test branch. Each test runs in its own transaction and rolls back after completion, so test data is not persisted and multiple developers or CI runners can execute tests safely in parallel.

## CI

Pull requests automatically run the repository CI pipeline. The backend job runs:

- `uv run ruff check .`
- `uv run ruff format --check .`
- `uv run mypy`
- `uv run alembic upgrade head` against `DATABASE_URL_TEST`
- `uv run pytest`

The frontend job runs:

- `pnpm lint:web`
- `pnpm --filter web typecheck`
- `pnpm format:check`

See `.github/workflows/ci.yml` for the exact CI configuration.

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

Frontend applications configure the API base URL via `NEXT_PUBLIC_API_BASE_URL` in `apps/web/.env`:

```ts
import { client, healthCheckApiV1HealthGet } from "@kaiwa-app/api-client";

client.setConfig({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
});
```

## Project structure

- `apps/web/` — Next.js frontend application
- `apps/api/` — FastAPI backend, Alembic configuration, and API tests
- `packages/api-client/` — shared generated TypeScript API contracts and client
- `docs/` — product, architecture, database, API, testing, and deployment documentation
- `scripts/` — repository automation scripts
- `Makefile` — shortcuts for common development workflows
- `compose.yml` — Docker containerized services

## License

This project is available under the [MIT License](LICENSE).

---

For backend-specific development, migrations, and architecture notes, see [`apps/api/README.md`](apps/api/README.md). Additional product and engineering documentation is available in [`docs/`](docs/).
