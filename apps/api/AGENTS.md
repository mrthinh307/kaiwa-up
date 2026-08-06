# FastAPI API Guidelines

## Scope

- Applies to `apps/api/` and extends the repository-root `AGENTS.md`.
- Follow `docs/08-coding-convention.md` and `docs/07-module-design.md` when more detail is needed.
- Keep changes compatible with Python 3.12+, strict mypy, Ruff, and the pinned dependencies.

## Architecture

- Preserve the dependency flow: `endpoint -> service -> repository -> database`.
- `api/v1/endpoints/`: handle HTTP input/output and call services; keep handlers thin.
- `services/`: own use cases, business rules, and transaction boundaries; remain HTTP-agnostic.
- `repositories/`: own persistence queries; never decide HTTP status codes or client messages.
- `schemas/`: define public Pydantic request/response contracts.
- `models/`: define SQLAlchemy persistence models; never expose ORM models directly as responses.
- `api/dependencies/`: contain reusable FastAPI dependencies and resource lifecycle management.
- `core/`: contain application-wide infrastructure only; keep domain rules out.
- `exceptions/`: contain `AppError` subclasses and global exception handling.
- `utils/`: contain small, pure, genuinely shared helpers; keep domain helpers near their domain.
- Use the same domain module name across layers, such as `endpoints/lesson.py`,
  `services/lesson.py`, `repositories/lesson.py`, `schemas/lesson.py`, and `models/lesson.py`.

## FastAPI

- Give each HTTP operation its own handler.
- Define `prefix`, `tags`, and shared dependencies on the closest `APIRouter`.
- Keep parent routers limited to composing child routers and API version prefixes.
- Declare a typed return value or `response_model` for every endpoint.
- Use `response_model` when the internal return type differs from the public API schema.
- Declare non-default status codes explicitly and follow HTTP semantics.
- Use `Annotated[..., Depends(...)]`; create descriptive `PascalCase` aliases for reused
  dependencies without requiring a `Dep` suffix.
- Dependency factories start with `get_`; resource dependencies use `yield` for cleanup.
- Never call FastAPI dependency factories from services; inject values through parameters or
  constructors.
- Use `async def` only for fully async I/O. Use `def` for blocking libraries and never block the
  event loop from async code.
- Avoid request waterfalls; run independent async operations concurrently when safe.

## Schemas and validation

- Keep request, response, and ORM models separate when their responsibilities differ.
- Use suffixes such as `Create`, `Update`, and `Response` for operation-specific schemas.
- Express required fields through types; do not use `...` defaults or Pydantic `RootModel`.
- Give optional fields an explicit nullable type and default.
- Use `Field` constraints for validation that belongs at the API boundary.
- Validate and normalize untrusted data before passing it to business logic.
- Keep API machine values and error codes stable and in `snake_case`.

## Database and transactions

- Use SQLAlchemy typed mappings with `Mapped[...]` and `mapped_column(...)`.
- Repositories may query, add, delete, and `flush()`, but must not call `commit()` or `rollback()`.
- Services own commit/rollback decisions for the complete use case.
- Pass `AsyncSession` through dependencies; do not create ad hoc sessions in domain code.
- Use timezone-aware UTC datetimes and `app.utils.datetime_utils.utc_now` for application time.
- Register new ORM models through `app/models/__init__.py` so Alembic metadata includes them.
- Every database schema change requires a reviewed Alembic migration.
- Generate migrations with `uv run alembic revision --autogenerate -m "<description>"`, inspect the
  generated operations, then apply with `uv run alembic upgrade head`.

## Errors and logging

- Let Pydantic/FastAPI handle invalid input and raise an `AppError` subclass for expected business
  failures.
- Preserve the common error envelope: `error.status`, `error.code`, `error.message`, and
  `error.details`.
- Catch exceptions only to recover, add context, or translate them; use `raise ... from exc`.
- Let unexpected failures reach the global handler for logging and a safe `internal_error` response.
- Use standard `logging` with module-level `logging.getLogger(__name__)`.
- Log useful identifiers and operation context, not credentials, tokens, raw personal data, or full
  request bodies.

## Configuration and security

- Read configuration through `app.core.Settings`; do not scatter `os.environ` reads.
- Add new variables to `.env.example` with safe placeholder values.
- Enforce authentication, authorization, ownership, and rate limits on the backend.
- Use SQLAlchemy expressions and parameterized queries; never interpolate input into SQL.
- Filter responses through public schemas to prevent sensitive-field leakage.
- Keep password/token primitives in `core/security.py` and authentication workflows in services or
  dependencies.
- Never expose stack traces, SQL, secrets, internal paths, or raw exception messages to clients.

## Testing and verification

- Put backend tests under `tests/`; name files `test_<subject>.py` and functions
  `test_<expected_behavior>`.
- Reuse fixtures from `tests/conftest.py`; override dependencies for isolated resources when needed.
- Test observable behavior, status codes, response schemas, error envelopes, and transaction
  outcomes rather than private implementation details.
- Add regression coverage for every bug fix and tests for changed business behavior.
- From the repository root, run:
  - `uv --directory apps/api run ruff check .`
  - `uv --directory apps/api run ruff format --check .`
  - `uv --directory apps/api run mypy`
  - `uv --directory apps/api run pytest`
- For API contract changes, update the OpenAPI/client artifacts using repository tooling when the
  generator is available.

## Do not

- Do not put business rules or database queries in endpoints.
- Do not let services depend on `Request`, `JSONResponse`, routers, or HTTP-specific exceptions.
- Do not let repositories return HTTP responses or own transactions.
- Do not use one class as both an ORM model and a public API schema.
- Do not add `_async` suffixes to async functions.
- Do not suppress Ruff or mypy errors merely to pass checks; keep justified suppressions narrow.
- Do not edit production data manually instead of creating a migration.
- Do not add background tasks for work requiring guaranteed completion without durable queue and
  retry semantics.
