import pytest
from pydantic import ValidationError

from app.core.config import Settings


def production_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "environment": "production",
        "debug": False,
        "cors_origins": ["https://kaiwa.example"],
        "JWT_SECRET_KEY": "production-secret-that-is-at-least-32-characters",
        "REFRESH_COOKIE_SECURE": True,
        "CLOUDINARY_URL": "cloudinary://key:secret@cloud",
    }
    values.update(overrides)
    return Settings.model_validate(values)


def test_production_settings_accept_secure_configuration() -> None:
    configured_settings = production_settings()

    assert configured_settings.environment == "production"
    assert configured_settings.has_cloudinary_config is True


def test_production_settings_reject_unsafe_defaults() -> None:
    with pytest.raises(ValidationError) as exc_info:
        production_settings(
            debug=True,
            cors_origins=["*", "http://localhost:3000"],
            JWT_SECRET_KEY="secret",
            REFRESH_COOKIE_SECURE=False,
            CLOUDINARY_URL=None,
        )

    message = str(exc_info.value)
    assert "DEBUG must be false" in message
    assert "JWT_SECRET_KEY must not use a documented default" in message
    assert "REFRESH_COOKIE_SECURE must be true" in message
    assert "Cloudinary configuration is required" in message
    assert "CORS_ORIGINS must contain only explicit HTTPS origins" in message


def test_release_sha_prefers_render_commit() -> None:
    configured_settings = Settings(
        release_sha="workflow-sha",
        render_git_commit="render-sha",
        _env_file=None,
    )

    assert configured_settings.effective_release_sha == "render-sha"
