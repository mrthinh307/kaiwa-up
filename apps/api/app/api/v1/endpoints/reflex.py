import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, Path, UploadFile, status

from app.api.dependencies.ai import AiGatewayDep
from app.api.dependencies.auth import CurrentUser
from app.api.dependencies.database import DatabaseSession
from app.repositories.reflex import ReflexRepository
from app.schemas.error import ErrorResponse
from app.schemas.reflex import ReflexEvaluationResponse, ReflexLessonDetail, ReflexLessonItem
from app.services.reflex import ReflexService

router = APIRouter(prefix="/reflex", tags=["Reflex"])


@router.get("/lessons", operation_id="listReflexLessons", response_model=list[ReflexLessonItem])
async def list_reflex_lessons(
    current_user: CurrentUser, session: DatabaseSession, ai_gateway: AiGatewayDep
) -> list[ReflexLessonItem]:
    return await ReflexService(ReflexRepository(session), ai_gateway).list_lessons()


@router.get(
    "/lessons/{lesson_id}",
    operation_id="getReflexLesson",
    response_model=ReflexLessonDetail,
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
)
async def get_reflex_lesson(
    lesson_id: Annotated[uuid.UUID, Path()],
    current_user: CurrentUser,
    session: DatabaseSession,
    ai_gateway: AiGatewayDep,
) -> ReflexLessonDetail:
    return await ReflexService(ReflexRepository(session), ai_gateway).get_lesson(lesson_id)


@router.post(
    "/lessons/{lesson_id}/evaluate",
    operation_id="evaluateReflexLesson",
    response_model=ReflexEvaluationResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_413_CONTENT_TOO_LARGE: {"model": ErrorResponse},
    },
)
async def evaluate_reflex_lesson(
    lesson_id: Annotated[uuid.UUID, Path()],
    audio_file: Annotated[UploadFile, File()],
    response_start_ms: Annotated[int, Form(ge=0)],
    current_user: CurrentUser,
    session: DatabaseSession,
    ai_gateway: AiGatewayDep,
) -> ReflexEvaluationResponse:
    return await ReflexService(ReflexRepository(session), ai_gateway).evaluate(
        user_id=current_user.id,
        content_id=lesson_id,
        audio_file=audio_file,
        response_start_ms=response_start_ms,
    )
