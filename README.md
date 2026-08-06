# KaiwaUp

KaiwaUp is a monorepo for a Japanese listening and speaking practice platform. It combines a Next.js frontend with a FastAPI backend and is designed to support interactive exercises such as shadowing, dictation, quick-response practice, gamification, and AI-assisted conversation.

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
  "status": "ok"
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

## API client generation

The `packages/api-client` workspace is reserved for types and client functions generated from the FastAPI OpenAPI schema. The generator is currently a placeholder, so the following command will exit with an explanatory error until an OpenAPI generator is configured:

```bash
make generate-api-client
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
