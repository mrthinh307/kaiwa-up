"use client";

import type {
  TutorConversationCreateResponse,
  TutorConversationDetailResponse,
  TutorMessageCreateRequest,
  TutorMessageCreateResponse,
} from "@kaiwa-app/api-client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { getTutorConversation, sendTutorMessage } from "@/lib/api-client";
import { parseApiFailure, type ApiFailure } from "@/lib/api-errors";

import {
  executeTutorRequest,
  isTutorRequestError,
  type TutorRetryScheduled,
} from "../_lib/ai-tutor-request";

type TutorDetailState = "error" | "loading" | "new" | "ready" | "unavailable";

function getTutorFailure(error: unknown): ApiFailure {
  return isTutorRequestError(error) ? error.failure : parseApiFailure({ error });
}

function isUnavailableStatus(status: number | undefined): boolean {
  return status === 403 || status === 404 || status === 422;
}

type TutorConversationOptions = {
  conversationId: string | null;
};

export function useTutorConversation({ conversationId }: TutorConversationOptions) {
  const { protectedRequest } = useAuth();
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | undefined>();
  const [detailRetryAttempt, setDetailRetryAttempt] = useState(0);
  const [detailState, setDetailState] = useState<TutorDetailState>(
    conversationId ? "loading" : "new",
  );
  const [selectedConversation, setSelectedConversation] =
    useState<TutorConversationDetailResponse | null>(null);
  const isActiveRef = useRef(true);
  const createdConversationIdRef = useRef<string | null>(null);
  const detailRequestIdRef = useRef(0);
  const sendControllersRef = useRef(new Map<string, AbortController>());

  const requestDetail = useCallback(
    (id: string, onRetryScheduled?: (info: TutorRetryScheduled) => void) =>
      executeTutorRequest(
        () =>
          protectedRequest(() =>
            getTutorConversation({
              path: { conversation_id: id },
            }),
          ),
        { onRetryScheduled },
      ),
    [protectedRequest],
  );

  const requestMessage = useCallback(
    (
      id: string,
      request: TutorMessageCreateRequest,
      onRetryScheduled?: (info: TutorRetryScheduled) => void,
      signal?: AbortSignal,
    ) =>
      executeTutorRequest(
        () =>
          protectedRequest(() =>
            sendTutorMessage({
              body: request,
              path: { conversation_id: id },
              signal,
            }),
          ),
        { onRetryScheduled, signal },
      ),
    [protectedRequest],
  );

  const loadDetail = useCallback(
    async (id: string) => {
      if (!isActiveRef.current) {
        return;
      }

      const requestId = ++detailRequestIdRef.current;
      setDetailState("loading");
      setDetailErrorMessage(undefined);
      setDetailRetryAttempt(0);
      setSelectedConversation(null);

      try {
        const result = await requestDetail(id, ({ attempt }) => {
          setDetailRetryAttempt(attempt);
        });

        if (!isActiveRef.current || requestId !== detailRequestIdRef.current) {
          return;
        }

        if (result.data) {
          setSelectedConversation(result.data);
          setDetailState("ready");
          return;
        }

        const failure = parseApiFailure(result);
        setDetailErrorMessage(failure.message);
        setDetailState(isUnavailableStatus(failure.status) ? "unavailable" : "error");
      } catch (error) {
        if (!isActiveRef.current || requestId !== detailRequestIdRef.current) {
          return;
        }

        const failure = getTutorFailure(error);
        setDetailErrorMessage(failure.message);
        setDetailState(isUnavailableStatus(failure.status) ? "unavailable" : "error");
      } finally {
        if (requestId === detailRequestIdRef.current) {
          setDetailRetryAttempt(0);
        }
      }
    },
    [requestDetail],
  );

  const acceptCreatedConversation = useCallback((conversation: TutorConversationCreateResponse) => {
    createdConversationIdRef.current = conversation.conversation_id;
    setSelectedConversation(conversation);
    setDetailErrorMessage(undefined);
    setDetailState("ready");
  }, []);

  const invalidateDetailRequest = useCallback(() => {
    ++detailRequestIdRef.current;
  }, []);

  const clearConversation = useCallback(() => {
    invalidateDetailRequest();
    setSelectedConversation(null);
    setDetailErrorMessage(undefined);
    setDetailState("new");
  }, [invalidateDetailRequest]);

  const cancelMessageRequest = useCallback((id: string) => {
    sendControllersRef.current.get(id)?.abort();
  }, []);

  const sendMessage = useCallback(
    async (
      id: string,
      request: TutorMessageCreateRequest,
      onRetryScheduled?: (info: TutorRetryScheduled) => void,
    ): Promise<TutorMessageCreateResponse> => {
      const controller = new AbortController();
      sendControllersRef.current.set(id, controller);
      let result: Awaited<ReturnType<typeof sendTutorMessage>>;
      try {
        result = await requestMessage(id, request, onRetryScheduled, controller.signal);
      } catch (error) {
        const failure = getTutorFailure(error);
        if (failure.status === 403 || failure.status === 404) {
          setDetailErrorMessage(failure.message);
          setDetailState("unavailable");
        }
        throw error;
      } finally {
        if (sendControllersRef.current.get(id) === controller) {
          sendControllersRef.current.delete(id);
        }
      }

      if (!result.data) {
        throw new Error(parseApiFailure(result).message);
      }

      const messageResponse = result.data;
      setSelectedConversation((current) => {
        if (!current || current.conversation_id !== id) {
          return current;
        }

        const messagesById = new Map(
          (current.messages ?? []).map((message) => [message.id, message]),
        );
        messagesById.set(messageResponse.user_message.id, messageResponse.user_message);
        messagesById.set(messageResponse.ai_reply.id, messageResponse.ai_reply);

        return {
          ...current,
          messages: Array.from(messagesById.values()).sort(
            (left, right) => left.sequence_number - right.sequence_number,
          ),
        };
      });

      return messageResponse;
    },
    [requestMessage],
  );

  useEffect(() => {
    isActiveRef.current = true;
    const sendControllers = sendControllersRef.current;

    return () => {
      isActiveRef.current = false;
      sendControllers.forEach((controller) => controller.abort());
      sendControllers.clear();
    };
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      if (conversationId) {
        if (createdConversationIdRef.current === conversationId) {
          createdConversationIdRef.current = null;
          return;
        }

        void loadDetail(conversationId);
        return;
      }

      clearConversation();
    }, 0);

    return () => {
      invalidateDetailRequest();
      window.clearTimeout(loadTimer);
    };
  }, [clearConversation, conversationId, invalidateDetailRequest, loadDetail]);

  const retryDetail = useCallback(() => {
    if (conversationId) {
      void loadDetail(conversationId);
    }
  }, [conversationId, loadDetail]);

  return {
    acceptCreatedConversation,
    cancelMessageRequest,
    clearConversation,
    detailErrorMessage,
    detailRetryAttempt,
    detailState,
    retryDetail,
    selectedConversation,
    sendMessage,
  };
}
