from starlette import status

from app.exceptions.base import AppError


class ShadowingContentNotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "shadowing_content_not_found"
    message = "Shadowing content not found or not published"


class ShadowingInvalidSegmentError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "shadowing_invalid_segment"
    message = "Segment ID does not exist in content transcript"


class ShadowingAudioTooLargeError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "shadowing_audio_too_large"
    message = "Audio file size exceeds maximum allowed limit (10MB)"


class ShadowingInvalidAudioError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "shadowing_invalid_audio"
    message = "Invalid or empty audio file provided"


class ShadowingAttemptNotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "shadowing_attempt_not_found"
    message = "Shadowing attempt not found"


class ShadowingAttemptNotInProgressError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "shadowing_attempt_not_in_progress"
    message = "Shadowing attempt is not in progress"


class ShadowingAttemptModeMismatchError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "shadowing_attempt_mode_mismatch"
    message = "Shadowing attempt mode does not match this recording operation"

    def __init__(self, *, attempt_mode: str, requested_mode: str) -> None:
        super().__init__(
            details={
                "attempt_mode": attempt_mode,
                "requested_mode": requested_mode,
            }
        )


class ShadowingContentUnavailableError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "shadowing_content_unavailable"
    message = "Shadowing content is not ready for practice"


class ShadowingNoRecordingsError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "shadowing_no_recordings"
    message = "Save at least one recording before submitting this attempt"


class ShadowingRecordingsChangedError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "shadowing_recordings_changed"
    message = "The saved recordings changed. Refresh the attempt before submitting"


class ShadowingAudioProcessingUnavailableError(AppError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "shadowing_audio_processing_unavailable"
    message = "Audio processing is temporarily unavailable. Please try again later"


class ShadowingRecordingIdempotencyConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "shadowing_recording_idempotency_conflict"
    message = "This recording identifier was already used for a different take"


class ShadowingAttemptNotCompletedError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "shadowing_attempt_not_completed"
    message = "Submit the attempt before requesting a review"


class ShadowingReviewRateLimitError(AppError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "shadowing_review_rate_limited"
    message = "Too many processing requests. Please wait before retrying"


class ShadowingAiInputTooLongError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    code = "shadowing_ai_input_too_long"
    message = "A transcript exceeds the configured AI review input budget"


class ShadowingTranscriptionPendingError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "shadowing_transcription_pending"
    message = "Wait for transcription to finish before requesting AI feedback"


class ShadowingReviewChangedError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "shadowing_review_changed"
    message = "The review changed. Refresh it before requesting AI feedback"


class ShadowingPartialReviewRequiredError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "shadowing_partial_review_required"
    message = "Some transcripts are unavailable. Retry them or explicitly request a partial review"


class ShadowingNoEvaluableSpeechError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    code = "shadowing_no_evaluable_speech"
    message = "There is no recognized speech available for an AI review"


class ShadowingAiUnavailableError(AppError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "shadowing_ai_unavailable"
    message = "AI feedback is temporarily unavailable"
