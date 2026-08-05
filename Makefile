.PHONY: help install dev-web build-web lint-web dev-api lint-api typecheck-api test-api generate-api-client

help:
	@echo "Available commands:"
	@echo "  make install              Install JavaScript dependencies"
	@echo "  make dev-web              Start the Next.js development server"
	@echo "  make build-web            Build the Next.js application"
	@echo "  make lint-web             Lint the Next.js application"
	@echo "  make dev-api              Start the FastAPI development server"
	@echo "  make lint-api             Lint the FastAPI application"
	@echo "  make typecheck-api        Type-check the FastAPI application"
	@echo "  make test-api             Run the FastAPI test suite"
	@echo "  make generate-api-client  Generate the TypeScript API client"

install:
	pnpm install

dev-web:
	pnpm dev:web

build-web:
	pnpm build:web

lint-web:
	pnpm lint:web

dev-api:
	cd apps/api && uv run uvicorn app.main:app --reload

lint-api:
	cd apps/api && uv run ruff check .

typecheck-api:
	cd apps/api && uv run mypy

test-api:
	cd apps/api && uv run pytest

generate-api-client:
	pnpm generate:api-client
