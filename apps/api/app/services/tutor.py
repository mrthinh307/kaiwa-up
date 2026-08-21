"""Business logic for AI Tutor conversations."""

import math
import uuid
from collections.abc import Sequence

from sqlalchemy.exc import IntegrityError

from app.exceptions.ai import AiProviderError
from app.exceptions.tutor import (
    TutorAiUnavailableError,
    TutorConversationCompletedError,
    TutorConversationForbiddenError,
    TutorConversationNotFoundError,
    TutorMessageIdempotencyConflictError,
    TutorResponsePendingError,
)
from app.integrations.ai import AiGateway, TutorReply
from app.integrations.ai import TutorMessage as GatewayTutorMessage
from app.models.enums import TutorExplanationLanguage, TutorSender
from app.models.tutor import TutorMessage, TutorSession
from app.repositories.tutor import TutorConversationHistoryRow, TutorRepository
from app.schemas.tutor import (
    TutorAnswerHintResponse,
    TutorConversationCreateRequest,
    TutorConversationCreateResponse,
    TutorConversationDetailResponse,
    TutorConversationFields,
    TutorConversationListItem,
    TutorConversationListResponse,
    TutorCorrectionResponse,
    TutorFeedbackResponse,
    TutorMessageCreateRequest,
    TutorMessageCreateResponse,
    TutorMessageResponse,
    TutorSessionStatus,
    TutorTextMeaningResponse,
)

DEFAULT_TUTOR_CONTEXT_MESSAGE_LIMIT = 20


class TutorService:
    def __init__(
        self,
        repository: TutorRepository,
        gateway: AiGateway,
        *,
        context_message_limit: int = DEFAULT_TUTOR_CONTEXT_MESSAGE_LIMIT,
    ) -> None:
        if context_message_limit < 1:
            raise ValueError("context_message_limit must be positive")
        self.repository = repository
        self.gateway = gateway
        self.context_message_limit = context_message_limit

    async def create_conversation(
        self,
        *,
        user_id: uuid.UUID,
        data: TutorConversationCreateRequest,
    ) -> TutorConversationCreateResponse:
        topic = data.topic
        scenario = data.scenario

        try:
            reply = await self.gateway.generate_tutor_reply(
                messages=[],
                topic=topic,
                difficulty=data.difficulty.value,
                scenario=scenario,
                explanation_language=data.explanation_language.value,
            )
        except AiProviderError as exc:
            await self.repository.session.rollback()
            raise TutorAiUnavailableError() from exc

        try:
            tutor_session = await self.repository.create_session(
                user_id=user_id,
                topic=topic,
                difficulty=data.difficulty,
                scenario=scenario,
                explanation_language=data.explanation_language,
            )
            initial_message = await self.repository.create_message(
                session_id=tutor_session.id,
                sender=TutorSender.AI,
                sequence_number=1,
                content=reply.message,
                text_meaning=reply.text_meaning.model_dump(mode="json"),
                client_message_id=None,
                feedback=self._serialize_feedback(reply),
            )
            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            raise

        fields = self._conversation_fields(tutor_session)
        return TutorConversationCreateResponse(
            conversation_id=fields.conversation_id,
            topic=fields.topic,
            difficulty=fields.difficulty,
            scenario=fields.scenario,
            explanation_language=fields.explanation_language,
            status=fields.status,
            initial_message=self._to_message_response(initial_message),
        )

    async def list_conversations(
        self,
        *,
        user_id: uuid.UUID,
        page: int,
        page_size: int,
    ) -> TutorConversationListResponse:
        rows, total = await self.repository.list_sessions_for_user(
            user_id=user_id,
            limit=page_size,
            offset=(page - 1) * page_size,
        )
        return TutorConversationListResponse(
            items=[self._to_list_item(row) for row in rows],
            total_items=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    async def get_conversation(
        self,
        *,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID,
    ) -> TutorConversationDetailResponse:
        tutor_session = await self._get_owned_session(user_id, conversation_id)
        messages = await self.repository.list_messages(tutor_session.id)
        fields = self._conversation_fields(tutor_session)
        return TutorConversationDetailResponse(
            conversation_id=fields.conversation_id,
            topic=fields.topic,
            difficulty=fields.difficulty,
            scenario=fields.scenario,
            explanation_language=fields.explanation_language,
            status=fields.status,
            started_at=tutor_session.started_at,
            ended_at=tutor_session.ended_at,
            messages=[self._to_message_response(message) for message in messages],
        )

    async def send_message(
        self,
        *,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID,
        data: TutorMessageCreateRequest,
    ) -> TutorMessageCreateResponse:
        tutor_session = await self._get_owned_session(
            user_id,
            conversation_id,
            for_update=True,
        )
        if tutor_session.status == "completed":
            raise TutorConversationCompletedError()

        user_message = await self.repository.get_user_message_by_client_id(
            session_id=conversation_id,
            client_message_id=data.client_message_id,
        )
        if user_message is not None and user_message.content != data.text:
            raise TutorMessageIdempotencyConflictError()

        if user_message is None:
            last_message = await self.repository.get_last_message(conversation_id)
            if last_message is not None and last_message.sender == TutorSender.USER:
                raise TutorResponsePendingError()
            next_sequence = (last_message.sequence_number if last_message else 0) + 1
            user_message = await self.repository.create_message(
                session_id=conversation_id,
                sender=TutorSender.USER,
                sequence_number=next_sequence,
                content=data.text,
                client_message_id=data.client_message_id,
            )
            await self.repository.session.commit()
        else:
            cached_reply = await self.repository.get_message_by_sequence(
                session_id=conversation_id,
                sequence_number=user_message.sequence_number + 1,
            )
            if cached_reply is not None:
                await self.repository.session.commit()
                return TutorMessageCreateResponse(
                    user_message=self._to_message_response(user_message),
                    ai_reply=self._to_message_response(cached_reply),
                )
            await self.repository.session.commit()

        context_messages = await self.repository.get_context_messages(
            conversation_id,
            limit=self.context_message_limit,
        )
        gateway_messages = self._to_gateway_messages(context_messages)
        topic = self._require_topic(tutor_session)
        difficulty = self._require_difficulty(tutor_session)
        scenario = tutor_session.scenario
        await self.repository.session.commit()

        try:
            reply = await self.gateway.generate_tutor_reply(
                messages=gateway_messages,
                topic=topic,
                difficulty=difficulty,
                scenario=scenario,
                explanation_language=(
                    tutor_session.explanation_language or TutorExplanationLanguage.VI
                ).value,
            )
        except AiProviderError as exc:
            await self.repository.session.rollback()
            raise TutorAiUnavailableError() from exc

        ai_reply = await self.repository.get_message_by_sequence(
            session_id=conversation_id,
            sequence_number=user_message.sequence_number + 1,
        )
        if ai_reply is None:
            try:
                ai_reply = await self.repository.create_message(
                    session_id=conversation_id,
                    sender=TutorSender.AI,
                    sequence_number=user_message.sequence_number + 1,
                    content=reply.message,
                    text_meaning=reply.text_meaning.model_dump(mode="json"),
                    client_message_id=None,
                    feedback=self._serialize_feedback(reply),
                )
                await self.repository.session.commit()
            except IntegrityError:
                await self.repository.session.rollback()
                ai_reply = await self.repository.get_message_by_sequence(
                    session_id=conversation_id,
                    sequence_number=user_message.sequence_number + 1,
                )
                if ai_reply is None:
                    raise
        else:
            await self.repository.session.commit()

        if ai_reply is None:
            raise RuntimeError("Tutor AI reply was not persisted")

        return TutorMessageCreateResponse(
            user_message=self._to_message_response(user_message),
            ai_reply=self._to_message_response(ai_reply),
        )

    async def delete_conversation(
        self,
        *,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID,
    ) -> None:
        tutor_session = await self._get_owned_session(
            user_id,
            conversation_id,
            for_update=True,
        )
        try:
            await self.repository.delete_session(tutor_session)
            await self.repository.session.commit()
        except Exception:
            await self.repository.session.rollback()
            raise

    async def _get_owned_session(
        self,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID,
        *,
        for_update: bool = False,
    ) -> TutorSession:
        tutor_session = (
            await self.repository.get_session_for_update(conversation_id)
            if for_update
            else await self.repository.get_session(conversation_id)
        )
        if tutor_session is None:
            raise TutorConversationNotFoundError()
        if tutor_session.user_id != user_id:
            raise TutorConversationForbiddenError()
        return tutor_session

    @staticmethod
    def _conversation_fields(tutor_session: TutorSession) -> TutorConversationFields:
        if tutor_session.topic is None:
            raise RuntimeError("Tutor session is missing topic snapshot")
        if tutor_session.difficulty is None:
            raise RuntimeError("Tutor session is missing difficulty")

        status: TutorSessionStatus
        if tutor_session.status == "active":
            status = "active"
        elif tutor_session.status == "completed":
            status = "completed"
        else:
            raise RuntimeError("Tutor session has an invalid status")

        return TutorConversationFields(
            conversation_id=tutor_session.id,
            topic=tutor_session.topic,
            difficulty=tutor_session.difficulty,
            scenario=tutor_session.scenario,
            explanation_language=(
                tutor_session.explanation_language or TutorExplanationLanguage.VI
            ),
            status=status,
        )

    def _to_list_item(self, row: TutorConversationHistoryRow) -> TutorConversationListItem:
        fields = self._conversation_fields(row.session)
        return TutorConversationListItem(
            conversation_id=fields.conversation_id,
            topic=fields.topic,
            difficulty=fields.difficulty,
            scenario=fields.scenario,
            status=fields.status,
            last_message_text=row.last_message_text,
            updated_at=row.updated_at,
        )

    @staticmethod
    def _to_message_response(message: TutorMessage) -> TutorMessageResponse:
        return TutorMessageResponse(
            id=message.id,
            sender=message.sender,
            sequence_number=message.sequence_number,
            text=message.content,
            text_meaning=(
                TutorTextMeaningResponse.model_validate(message.text_meaning)
                if message.text_meaning is not None
                else None
            ),
            client_message_id=message.client_message_id,
            created_at=message.created_at,
            feedback=(
                TutorFeedbackResponse.model_validate(message.feedback)
                if message.feedback is not None
                else None
            ),
        )

    @staticmethod
    def _serialize_feedback(reply: TutorReply) -> dict[str, object]:
        feedback = TutorFeedbackResponse(
            explanation_language=reply.explanation_language,
            grammar_correction=TutorService._format_corrections(reply),
            corrections=[
                TutorCorrectionResponse(
                    original=correction.original,
                    corrected=correction.corrected,
                    explanation=correction.explanation,
                )
                for correction in reply.corrections
            ],
            natural_expression_tip=(
                reply.natural_expression_tip.explanation
                if reply.natural_expression_tip is not None
                else None
            ),
            natural_expression_example_ja=(
                reply.natural_expression_tip.example_ja
                if reply.natural_expression_tip is not None
                else None
            ),
            answer_hints=[
                TutorAnswerHintResponse(
                    text=hint.text,
                    text_meaning={
                        "language": hint.text_meaning.language,
                        "text": hint.text_meaning.text,
                    },
                )
                for hint in reply.answer_hints
            ],
        )
        return feedback.model_dump(mode="json")

    @staticmethod
    def _format_corrections(reply: TutorReply) -> str | None:
        if not reply.corrections:
            return None
        return "\n".join(
            f"{correction.original} → {correction.corrected} ({correction.explanation})"
            for correction in reply.corrections
        )

    @staticmethod
    def _to_gateway_messages(messages: Sequence[TutorMessage]) -> list[GatewayTutorMessage]:
        return [
            GatewayTutorMessage(
                role="assistant" if message.sender == TutorSender.AI else "user",
                content=message.content,
            )
            for message in messages
        ]

    @staticmethod
    def _require_topic(tutor_session: TutorSession) -> str:
        if tutor_session.topic is None:
            raise RuntimeError("Tutor session is missing topic snapshot")
        return tutor_session.topic

    @staticmethod
    def _require_difficulty(tutor_session: TutorSession) -> str:
        if tutor_session.difficulty is None:
            raise RuntimeError("Tutor session is missing difficulty")
        return tutor_session.difficulty.value
