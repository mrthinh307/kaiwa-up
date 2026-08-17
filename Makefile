-include .env
export

.PHONY: help install dev lint typecheck install-web dev-web build-web lint-web typecheck-web install-api dev-api lint-api typecheck-api test-api generate-api-client migrate-api migrate-api-test seed seed-clean seed-youtube

help:
	@echo "Available commands:"
	@echo "  make install              Install JavaScript and Python dependencies"
	@echo "  make dev                  Start the web and API development servers"
	@echo "  make lint                 Lint the web and API applications"
	@echo "  make typecheck            Type-check the web and API applications"
	@echo "  make install-web          Install JavaScript dependencies"
	@echo "  make dev-web              Start the Next.js development server"
	@echo "  make build-web            Build the Next.js application"
	@echo "  make lint-web             Lint the Next.js application"
	@echo "  make typecheck-web        Type-check the Next.js application"
	@echo "  make install-api          Install Python dependencies"
	@echo "  make dev-api              Start the FastAPI development server"
	@echo "  make lint-api             Lint the FastAPI application"
	@echo "  make typecheck-api        Type-check the FastAPI application"
	@echo "  make test-api             Run the FastAPI test suite (Neon test branch)"
	@echo "  make migrate-api          Run Alembic migration for development DB"
	@echo "  make migrate-api-test     Run Alembic migration for Neon test DB"
	@echo "  make generate-api-client  Generate the TypeScript API client"

# Install dependencies for both web and API
install:
	pnpm install
	cd apps/api && uv sync

dev:
	$(MAKE) --jobs=2 dev-web dev-api

lint:
	pnpm lint:web
	cd apps/api && uv run ruff check .

typecheck:
	pnpm --filter web typecheck
	cd apps/api && uv run mypy

# Separate commands for web and API
# Web commands
install-web:
	pnpm install

dev-web:
	pnpm dev:web

build-web:
	pnpm build:web

lint-web:
	pnpm lint:web

typecheck-web:
	pnpm --filter web typecheck

# API commands
install-api:
	cd apps/api && uv sync

dev-api:
	cd apps/api && uv run uvicorn app.main:app --reload

lint-api:
	cd apps/api && uv run ruff check .

typecheck-api:
	cd apps/api && uv run mypy

test-api:
	cd apps/api && DATABASE_URL_TEST=$(DATABASE_URL_TEST) uv run pytest

migrate-api:
	cd apps/api && uv run alembic upgrade head

migrate-api-test:
	cd apps/api && DATABASE_URL=$(DATABASE_URL_TEST) uv run alembic upgrade head

generate-api-client:
	pnpm generate:api-client

seed:
	cd apps/api && python -m scripts.seed_data

seed-clean: # Clean the database and seed learning resources from YouTube only for Shadowing, Dictation Feature.
	cd apps/api && python -m scripts.seed_data --clean

seed-youtube: # Seed learning resources from YouTube only for Shadowing, Dictation Feature.
	cd apps/api && uv run python -m scripts.seed_data --youtube-only

.PHONY: seed-reflex
seed-reflex: # Seed the current Reflex lessons for N5-N1 only.
	cd apps/api && uv run python -m scripts.seed_data --reflex-only

.PHONY: seed-translation
seed-translation: # Seed the current Listening & Translation lessons for N5-N1 only.
	cd apps/api && uv run python -m scripts.seed_data --translation-only

.PHONY: seed-tutor-scenarios
seed-tutor-scenarios: # Seed the current AI Tutor scenario catalog.
	cd apps/api && uv run python -m scripts.seed_data --tutor-scenarios-only
