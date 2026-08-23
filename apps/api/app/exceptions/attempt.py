import uuid

from starlette import status

from app.exceptions.base import AppError
from app.models.enums import PracticeMethod


class AttemptAlreadyInProgressError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "attempt_already_in_progress"
    message = "An attempt is already in progress for this practice method"

    def __init__(self, *, attempt_id: uuid.UUID, practice_method: PracticeMethod) -> None:
        super().__init__(
            details={
                "attempt_id": str(attempt_id),
                "practice_method": practice_method.value,
            }
        )
