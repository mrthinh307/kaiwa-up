"""AI Tutor conversation endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Path, Response, status

from app.api.dependencies.ai import AiGatewayDep
from app.api.dependencies.auth import CurrentUser
from app.api.dependencies.database import DatabaseSession
from app.api.dependencies.pagination import Pagination
from app.repositories.tutor import TutorRepository
from app.schemas.error import ErrorResponse
from app.schemas.tutor import (
    TutorConversationCreateRequest,
    TutorConversationCreateResponse,
    TutorConversationDetailResponse,
    TutorConversationListResponse,
    TutorMessageCreateRequest,
    TutorMessageCreateResponse,
)
from app.services.tutor import TutorService

router = APIRouter(prefix="/ai-tutor", tags=["AI Tutor"])


def _tutor_service(session: DatabaseSession, gateway: AiGatewayDep) -> TutorService:
    return TutorService(TutorRepository(session), gateway)


@router.post(
    "/conversations",
    operation_id="createTutorConversation",
    response_model=TutorConversationCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an AI Tutor conversation",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse},
    },
)
async def create_tutor_conversation(
    data: TutorConversationCreateRequest,
    current_user: CurrentUser,
    session: DatabaseSession,
    gateway: AiGatewayDep,
) -> TutorConversationCreateResponse:
    return await _tutor_service(session, gateway).create_conversation(
        user_id=current_user.id,
        data=data,
    )


@router.get(
    "/conversations",
    operation_id="listTutorConversations",
    response_model=TutorConversationListResponse,
    summary="List the current user's AI Tutor conversations",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
    },
)
async def list_tutor_conversations(
    current_user: CurrentUser,
    pagination: Pagination,
    session: DatabaseSession,
    gateway: AiGatewayDep,
) -> TutorConversationListResponse:
    return await _tutor_service(session, gateway).list_conversations(
        user_id=current_user.id,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get(
    "/conversations/{conversation_id}",
    operation_id="getTutorConversation",
    response_model=TutorConversationDetailResponse,
    summary="Get an AI Tutor conversation and its ordered messages",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
    },
)
async def get_tutor_conversation(
    conversation_id: Annotated[uuid.UUID, Path(description="AI Tutor conversation ID")],
    current_user: CurrentUser,
    session: DatabaseSession,
    gateway: AiGatewayDep,
) -> TutorConversationDetailResponse:
    return await _tutor_service(session, gateway).get_conversation(
        user_id=current_user.id,
        conversation_id=conversation_id,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    operation_id="sendTutorMessage",
    response_model=TutorMessageCreateResponse,
    summary="Send a text message to AI Tutor",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_409_CONFLICT: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse},
    },
)
async def send_tutor_message(
    conversation_id: Annotated[uuid.UUID, Path(description="AI Tutor conversation ID")],
    data: TutorMessageCreateRequest,
    current_user: CurrentUser,
    session: DatabaseSession,
    gateway: AiGatewayDep,
) -> TutorMessageCreateResponse:
    return await _tutor_service(session, gateway).send_message(
        user_id=current_user.id,
        conversation_id=conversation_id,
        data=data,
    )


@router.delete(
    "/conversations/{conversation_id}",
    operation_id="deleteTutorConversation",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an AI Tutor conversation",
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse},
    },
)
async def delete_tutor_conversation(
    conversation_id: Annotated[uuid.UUID, Path(description="AI Tutor conversation ID")],
    current_user: CurrentUser,
    session: DatabaseSession,
    gateway: AiGatewayDep,
) -> Response:
    await _tutor_service(session, gateway).delete_conversation(
        user_id=current_user.id,
        conversation_id=conversation_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
