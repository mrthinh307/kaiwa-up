from starlette import status

from app.exceptions.base import AppError


class DictationContentUnavailableError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "dictation_content_unavailable"
    message = "Dictation content is not ready for practice"


class DictationInvalidSegmentIndexError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "invalid_segment_index"
    message = "Segment index is outside the Dictation transcript"

    def __init__(self, *, segment_index: int, total_segments: int) -> None:
        super().__init__(
            details={
                "segment_index": segment_index,
                "total_segments": total_segments,
            }
        )


class DictationAttemptNotInProgressError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "dictation_attempt_not_in_progress"
    message = "Dictation attempt is not in progress"
