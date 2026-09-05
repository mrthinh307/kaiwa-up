# Kaiwa App

Kaiwa App is a monorepo for a Japanese listening and speaking practice platform. It combines a Next.js frontend with a FastAPI backend and supports interactive exercises such as shadowing, dictation, quick-response practice, gamification, and AI-assisted conversation.

## Tech stack

- Next.js 16, React 19, TypeScript, and Tailwind CSS
- FastAPI, SQLAlchemy, Alembic, and PostgreSQL
- pnpm workspaces for JavaScript packages
- uv for Python dependency and environment management
- GNU Make for common development commands

## Getting started

See [`docs/00-getting-started.md`](docs/00-getting-started.md) for prerequisites, local setup, development commands, backend testing, and API client generation.

## CI

Pull requests and pushes to `master` run the repository CI pipeline. The backend job runs linting, formatting checks, mypy, migrations, pytest, and a production Docker image build. The frontend job runs linting, type-checking, API client synchronization checks, formatting checks, and a production build.

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml) for the exact configuration.

## Deployment

The current Phase 1 demo is deployed manually:

- Frontend: <https://kaiwa-up-demo.vercel.app>
- Backend: <https://kaiwa-api.onrender.com>
- Backend readiness: <https://kaiwa-api.onrender.com/api/v1/ready>
- Verified release: `33c72b4996e59604b982dcc1866bb76ebd4a2fb6`

See [`docs/11-deployment.md`](docs/11-deployment.md) for deployment commands, smoke checks, rollback procedures, and the Phase 2 CD transition.

## Project structure

- `apps/web/` — Next.js frontend application
- `apps/api/` — FastAPI backend, Alembic configuration, and API tests
- `packages/api-client/` — shared generated TypeScript API contracts and client
- `docs/` — product, architecture, database, API, testing, and deployment documentation
- `scripts/` — repository automation scripts
- `Makefile` — shortcuts for common development workflows
- `compose.yml` — Docker containerized services

## Documentation

- [`docs/00-getting-started.md`](docs/00-getting-started.md) — local setup and development workflow
- [`apps/api/README.md`](apps/api/README.md) — backend-specific development, migrations, and architecture notes
- [`docs/`](docs/) — additional product and engineering documentation

## License

This project is available under the [MIT License](LICENSE).
