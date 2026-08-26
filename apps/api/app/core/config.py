from functools import lru_cache
from typing import Literal, Self

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Kaiwa App API"
    environment: Literal["development", "test", "staging", "production"] = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3000"]
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/app"
    database_url_test: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/app_test"
    migration_database_url: str | None = None
    release_sha: str = "local"
    render_git_commit: str | None = None

    JWT_SECRET_KEY: str = "secret"
    JWT_ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    REFRESH_COOKIE_NAME: str = "refresh_token"
    REFRESH_COOKIE_SECURE: bool = False
    REFRESH_COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"

    leaderboard_rebuild_interval_minutes: int = 1
    leaderboard_rebuild_enabled: bool = True

    STORAGE_DIR: str = "storage"
    CLOUDINARY_CLOUD_NAME: str | None = None
    CLOUDINARY_API_KEY: str | None = None
    CLOUDINARY_API_SECRET: str | None = None
    CLOUDINARY_URL: str | None = None
    CLOUDINARY_FOLDER: str = "kaiwa-up"

    demo_seed_password: SecretStr | None = None

    ai_tutor_provider: str = "fake"
    ai_tutor_fallback_providers: str = ""
    ai_eval_provider: str = "fake"
    ai_eval_fallback_providers: str = ""
    ai_stt_provider: str = "fake"
    ai_stt_fallback_providers: str = ""
    ai_llm_model: str | None = None
    ai_stt_model: str | None = None
    ai_temperature: float = 0.2
    ai_top_p: float = 1.0
    ai_max_output_tokens: int = 1000
    ai_stt_timeout_seconds: float | None = None
    ai_reflex_timeout_seconds: float | None = None
    ai_shadowing_timeout_seconds: float | None = None
    ai_translation_timeout_seconds: float | None = None
    ai_tutor_timeout_seconds: float | None = None
    ai_openai_api_key: SecretStr | None = None
    ai_openai_base_url: str = "https://api.openai.com/v1"
    ai_openai_llm_model: str = "gpt-4o-mini"
    ai_openai_stt_model: str = "whisper-1"
    ai_groq_api_key: SecretStr | None = None
    ai_groq_base_url: str = "https://api.groq.com/openai/v1"
    ai_groq_llm_model: str = "llama-3.3-70b-versatile"
    ai_groq_stt_model: str = "whisper-large-v3"
    ai_timeout_seconds: float = 30.0
    ai_max_retries: int = 2
    ai_retry_backoff_seconds: float = 0.5
    ai_max_retry_backoff_seconds: float = 8.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def effective_release_sha(self) -> str:
        return self.render_git_commit or self.release_sha

    @property
    def has_cloudinary_config(self) -> bool:
        return bool(
            self.CLOUDINARY_URL
            or (
                self.CLOUDINARY_CLOUD_NAME
                and self.CLOUDINARY_API_KEY
                and self.CLOUDINARY_API_SECRET
            )
        )

    @model_validator(mode="after")
    def validate_production_settings(self) -> Self:
        if self.environment != "production":
            return self

        errors: list[str] = []
        if self.debug:
            errors.append("DEBUG must be false")
        if self.JWT_SECRET_KEY in {"secret", "change-this-secret-in-production"}:
            errors.append("JWT_SECRET_KEY must not use a documented default")
        elif len(self.JWT_SECRET_KEY) < 32:
            errors.append("JWT_SECRET_KEY must contain at least 32 characters")
        if not self.REFRESH_COOKIE_SECURE:
            errors.append("REFRESH_COOKIE_SECURE must be true")
        if not self.has_cloudinary_config:
            errors.append("Cloudinary configuration is required")
        if not self.cors_origins:
            errors.append("CORS_ORIGINS must contain at least one HTTPS origin")
        elif any(
            origin == "*" or not origin.startswith("https://") for origin in self.cors_origins
        ):
            errors.append("CORS_ORIGINS must contain only explicit HTTPS origins")

        if errors:
            raise ValueError("Invalid production configuration: " + "; ".join(errors))

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
