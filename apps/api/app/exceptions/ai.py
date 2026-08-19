"""AI Gateway-related application exceptions."""

from starlette import status

from app.exceptions.base import AppError


class AiProviderError(AppError):
    """Base error for failures while calling an AI provider."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "ai_provider_error"
    message = "AI provider error"


class AiTimeoutError(AiProviderError):
    """Raised when the provider does not respond within the configured timeout."""

    status_code = status.HTTP_504_GATEWAY_TIMEOUT
    code = "ai_timeout"
    message = "AI provider request timed out"


class AiProviderUnavailableError(AiProviderError):
    """Raised when the provider is unreachable or returns a server error."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "ai_provider_unavailable"
    message = "AI provider is unavailable"


class AiProviderAuthError(AiProviderError):
    """Raised when the provider rejects the configured API key."""

    status_code = status.HTTP_502_BAD_GATEWAY
    code = "ai_provider_auth"
    message = "AI provider rejected the API key"


class AiRateLimitError(AiProviderError):
    """Raised when the provider rejects the request because of rate limits."""

    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "ai_rate_limited"
    message = "AI provider rate limit exceeded"


class AiInvalidResponseError(AiProviderError):
    """Raised when the provider returns a response that cannot be parsed or validated."""

    status_code = status.HTTP_502_BAD_GATEWAY
    code = "ai_invalid_response"
    message = "AI provider returned an invalid response"
