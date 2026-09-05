"use client";

import type {
  TutorAnswerHintResponse,
  TutorConversationDetailResponse,
  TutorMessageCreateRequest,
  TutorMessageCreateResponse,
  TutorMessageResponse,
} from "@kaiwa-app/api-client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { isTutorRequestError, type TutorRetryScheduled } from "../_lib/ai-tutor-request";

export type TutorTurnState = "retrying" | "sending" | "waiting_for_ai" | "retryable_error";
export type TutorComposerState = "draft" | TutorTurnState;

export type TutorTurn = {
  aiReply?: TutorMessageResponse;
  clientMessageId: string;
  errorMessage?: string;
  isUserMessagePersisted: boolean;
  retryAttempt?: number;
  state: TutorTurnState;
  text: string;
  userMessage: TutorMessageResponse;
};

type UseTutorTurnsOptions = {
  conversation: TutorConversationDetailResponse;
  onSendMessage: (
    conversationId: string,
    request: TutorMessageCreateRequest,
    onRetryScheduled?: (info: TutorRetryScheduled) => void,
  ) => Promise<TutorMessageCreateResponse>;
};

function getRecoveredTurn(conversation: TutorConversationDetailResponse): TutorTurn[] {
  const messages = [...(conversation.messages ?? [])].sort(
    (left, right) => left.sequence_number - right.sequence_number,
  );
  const lastMessage = messages.at(-1);

  if (lastMessage?.sender !== "user" || !lastMessage.client_message_id) {
    return [];
  }

  return [
    {
      clientMessageId: lastMessage.client_message_id,
      isUserMessagePersisted: true,
      state: "retryable_error",
      text: lastMessage.text,
      userMessage: lastMessage,
    },
  ];
}

export function useTutorTurns({ conversation, onSendMessage }: UseTutorTurnsOptions) {
  const messageListRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const nextSequenceRef = useRef(
    Math.max(0, ...(conversation.messages ?? []).map((message) => message.sequence_number)) + 1,
  );
  const [composerValue, setComposerValue] = useState("");
  const [turns, setTurns] = useState<TutorTurn[]>(() => getRecoveredTurn(conversation));
  const messages = [...(conversation.messages ?? [])].sort(
    (left, right) => left.sequence_number - right.sequence_number,
  );
  const isSending = turns.some(
    (turn) =>
      turn.state === "sending" || turn.state === "waiting_for_ai" || turn.state === "retrying",
  );
  const isComposerBlocked = turns.length > 0;
  const composerState: TutorComposerState = turns.at(-1)?.state ?? "draft";
  const turnStatusKey = turns.map((turn) => `${turn.clientMessageId}:${turn.state}`).join("|");

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) {
      return;
    }

    messageList.scrollTop = messageList.scrollHeight;
  }, [conversation.conversation_id, messages.length, turnStatusKey]);

  function updateTurn(clientMessageId: string, update: Partial<TutorTurn>) {
    if (!isMountedRef.current) {
      return;
    }

    setTurns((currentTurns) =>
      currentTurns.map((turn) =>
        turn.clientMessageId === clientMessageId ? { ...turn, ...update } : turn,
      ),
    );
  }

  async function processTurn(turn: TutorTurn) {
    updateTurn(turn.clientMessageId, { state: "sending" });
    updateTurn(turn.clientMessageId, { state: "waiting_for_ai" });

    const request: TutorMessageCreateRequest = {
      client_message_id: turn.clientMessageId,
      text: turn.text,
    };

    try {
      await onSendMessage(conversation.conversation_id, request, ({ attempt }) => {
        updateTurn(turn.clientMessageId, { retryAttempt: attempt, state: "retrying" });
      });
      if (isMountedRef.current) {
        setTurns((currentTurns) =>
          currentTurns.filter(
            (currentTurn) => currentTurn.clientMessageId !== turn.clientMessageId,
          ),
        );
      }
    } catch (error) {
      if (isTutorRequestError(error) && error.kind === "terminal") {
        if (isMountedRef.current) {
          setTurns((currentTurns) =>
            currentTurns.filter(
              (currentTurn) => currentTurn.clientMessageId !== turn.clientMessageId,
            ),
          );
          nextSequenceRef.current =
            Math.max(0, ...messages.map((message) => message.sequence_number)) + 1;
          toast.error("Message was not sent", { description: error.failure.message });
        }
        return;
      }

      updateTurn(turn.clientMessageId, {
        errorMessage:
          error instanceof Error
            ? error.message
            : "We could not send your answer. Please try again.",
        state: "retryable_error",
      });
    }
  }

  function handleComposerSubmit(text: string) {
    if (isComposerBlocked) {
      return;
    }

    const clientMessageId = globalThis.crypto.randomUUID();
    const userSequenceNumber = nextSequenceRef.current;
    nextSequenceRef.current += 2;
    const userMessage: TutorMessageResponse = {
      id: clientMessageId,
      sender: "user",
      sequence_number: userSequenceNumber,
      text,
      text_meaning: null,
      client_message_id: clientMessageId,
      created_at: new Date().toISOString(),
      feedback: null,
    };
    const turn: TutorTurn = {
      clientMessageId,
      isUserMessagePersisted: false,
      state: "sending",
      text,
      userMessage,
    };

    setTurns((currentTurns) => [...currentTurns, turn]);
    setComposerValue("");
    void processTurn(turn);
  }

  function handleRetry(turn: TutorTurn) {
    if (turn.state !== "retryable_error") {
      return;
    }

    void processTurn(turn);
  }

  function handleHintSelect(hint: TutorAnswerHintResponse) {
    setComposerValue(hint.text);
  }

  return {
    composerState,
    composerValue,
    handleComposerChange: setComposerValue,
    handleComposerSubmit,
    handleHintSelect,
    handleRetry,
    isComposerBlocked,
    isSending,
    messageListRef,
    messages,
    turns,
  };
}
