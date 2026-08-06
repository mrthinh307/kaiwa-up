# Kaiwa App Repository Guidelines

## Project overview

- Kaiwa App is a monorepo for Japanese listening and speaking practice.
- Frontend: Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4.
- Backend: FastAPI, Pydantic, async SQLAlchemy, Alembic, and PostgreSQL.
- JavaScript packages use pnpm workspaces; Python dependencies use uv.
- Follow the nearest nested `AGENTS.md`; it overrides this file for its subtree.

## Development Environment

- Required: Node.js >=20, pnpm 10 (pinned to 10.32.1), Python >=3.12,<3.14, and uv.
- PostgreSQL is required for database-backed development. GNU Make is optional.
- Install everything from the repository root with `make install`.
- Start both apps with `make dev`, or separately with `make dev-web` and `make dev-api`.
- Copy values from `.env.example` and `apps/api/.env.example`; never commit local `.env` files.
- Web runs at `http://localhost:3000`; API runs at `http://localhost:8000`.

## Codebase Structure

- `apps/web/`: Next.js frontend; routes live under `src/app/`.
- `apps/api/`: FastAPI app, Alembic migrations, and pytest tests.
- `apps/api/app/api/`: routers, endpoints, and request dependencies.
- `apps/api/app/models/`: SQLAlchemy persistence models.
- `apps/api/app/schemas/`: Pydantic API schemas.
- `apps/api/app/repositories/`: database access; may flush but must not commit.
- `apps/api/app/services/`: business logic and transaction boundaries.
- `packages/api-client/`: generated TypeScript API contracts and client code.
- `docs/`: product and engineering documentation; `scripts/`: repository automation.

## Code Style & Conventions

- Make focused changes and preserve existing architecture and public contracts.
- Use Prettier for supported workspace files; print width is 100 and indentation is 2 spaces.
- Prefer existing dependencies and patterns; justify any new runtime dependency.
- Keep frontend and backend separated; share API contracts through `@kaiwa-app/api-client`.

### TypeScript

- Keep strict typing and satisfy `noUncheckedIndexedAccess`; do not bypass types with `any`.
- Use the `@/*` alias for imports inside `apps/web/src` and `import type` for type-only imports.
- Follow configured ESLint import/export ordering.
- Prefer Server Components; add `"use client"` only for hooks, browser APIs, or interactivity.
- Do not hand-edit generated files in `packages/api-client`.

### Python

- Target Python 3.12 and keep code compatible with strict mypy and Ruff.
- Add explicit parameter and return types; use modern annotations such as `str | None`.
- Use `Annotated[..., Depends(...)]` for reusable FastAPI dependencies.
- Prefer Pydantic schemas or typed return values for API response validation and filtering.
- Use `async def` only with non-blocking I/O; keep blocking work in regular `def` functions.
- Endpoints coordinate HTTP concerns, services own business logic and transactions, and
  repositories own persistence queries.

### Naming Conventions

- TypeScript/React folders and files: `kebab-case`; framework files keep required names.
- Components: `PascalCase` (for example, `user-profile.tsx` exports `UserProfile`).
- Variables/functions: `camelCase`.
- Hooks: `camelCase` starting with `use` (for example, `use-current-user.ts` exports
  `useCurrentUser`).
- Event handlers/callback props: `handleX` / `onX`.
- TypeScript booleans: `isX`, `hasX`, `canX`, or `shouldX`.
- Types/interfaces/enums: `PascalCase`; no `I` prefix for interfaces.
- Component props: component name plus `Props` (for example, `LessonCardProps`).
- Global immutable constants/environment variables: `UPPER_SNAKE_CASE`.
- Python modules/variables/functions: `snake_case`; classes/schemas: `PascalCase`.
- Python booleans: `is_`, `has_`, `can_`, or `should_`; async functions have no `_async` suffix.
- Layer classes/schemas: suffix with `Service`, `Repository`, `Create`, `Update`, or `Response`.
- Endpoint handlers: verb + domain noun (for example, `list_lessons`, `get_lesson`).
- Dependency factories/aliases: `get_` prefix / descriptive `PascalCase`.
- API routes: plural `kebab-case`; parameters/JSON fields: `snake_case`.
- Dynamic route segments: descriptive `camelCase` (for example, `[lessonId]`).
- Error codes/API machine values: `snake_case`; CSS custom properties: `--kebab-case`.
- Database tables/columns: `snake_case`; table names are plural.
- Tests: `test_<subject>.py` and `test_<expected_behavior>`.
- Branches: `<type>/<kebab-case>`; commits: Conventional Commits.
- Treat common acronyms as words (`apiClient`, `HttpClient`, `user_id`); avoid vague names such as
  `data`, `info`, `temp`, `obj`, or `manager` when a domain name is available.

## Testing instructions

- Run the smallest relevant checks while iterating, then the full checks for the touched app.
- Backend (from `apps/api`): `uv run ruff check .`, `uv run mypy`, and `uv run pytest`.
- Frontend (from root): `pnpm lint:web` and `pnpm --filter web typecheck`; run
  `pnpm build:web` for routing, rendering, configuration, or production-impacting changes.
- Cross-workspace changes: run all frontend and backend checks above, then
  `pnpm format:check`.
- Add or update pytest coverage for backend behavior changes and regression fixes.
- No frontend test framework is configured; do not introduce one unless explicitly requested.
- Report any check not run and the reason.

## Security considerations

- Treat request data, cookies, headers, URLs, uploads, and API responses as untrusted.
- Enforce authentication, authorization, validation, and rate limits on the backend.
- Never commit secrets, tokens, credentials, private keys, or populated environment files.
- Never expose secrets through `NEXT_PUBLIC_*`, browser bundles, logs, or error responses.
- Use parameterized ORM/query APIs; do not construct SQL from user input.
- Return explicit public schemas so internal or sensitive model fields cannot leak.
- Review migrations and dependency changes for data-loss and supply-chain risk.

## Do not

- Do not mix unrelated refactors with the requested change.
- Do not import Python/backend implementation code into the frontend.
- Do not duplicate generated API types or manually edit generated client artifacts.
- Do not commit database transactions inside repositories.
- Do not run blocking operations inside async endpoints or dependencies.
- Do not weaken lint, type, test, or security rules merely to make checks pass.
- Do not modify lockfiles unless dependency changes require it.
- Do not commit build output, caches, local databases, or environment files.
