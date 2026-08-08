# Kaiwa App API

FastAPI backend managed with `uv` and organized using a layered architecture.

## Development

```bash
uv sync
uv run uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`, with OpenAPI documentation at
`http://localhost:8000/docs` and the health check at
`http://localhost:8000/api/v1/health`. The readiness check, including database
connectivity, is available at `http://localhost:8000/api/v1/ready`.

## Quality checks

```bash
uv run ruff check .
uv run mypy
uv run pytest
```

## Migrations

```bash
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

Repositories perform database access and may flush, but services own transaction
boundaries and decide when to commit or roll back.
