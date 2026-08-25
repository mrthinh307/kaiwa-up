"use client";

import type {
  TutorConversationCreateRequest,
  TutorConversationCreateResponse,
  TutorConversationDetailResponse,
  TutorConversationListItem,
  TutorConversationListResponse,
  TutorMessageCreateRequest,
  TutorMessageCreateResponse,
} from "@kaiwa-app/api-client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  createTutorConversation,
  deleteTutorConversation,
  getTutorConversation,
  listTutorConversations,
  sendTutorMessage,
} from "@/lib/api-client";
import { parseApiFailure, type ApiFailure } from "@/lib/api-errors";

import {
  executeTutorRequest,
  isTutorRequestError,
  type TutorRetryScheduled,
} from "../_lib/ai-tutor-request";
import { AiTutorLoading } from "./ai-tutor-loading";
import { AiTutorScreen, type AiTutorDetailState, type AiTutorListState } from "./ai-tutor-screen";

const AI_TUTOR_PAGE_SIZE = 20;

type ListRequestResult = Awaited<ReturnType<typeof listTutorConversations>>;
type DetailRequestResult = Awaited<ReturnType<typeof getTutorConversation>>;
type SendMessageResult = Awaited<ReturnType<typeof sendTutorMessage>>;

type AiTutorContentProps = {
  conversationId: string | null;
};

function parseThrownFailure(error: unknown): ApiFailure {
  return parseApiFailure({ error });
}

function getTutorFailure(error: unknown): ApiFailure {
  return isTutorRequestError(error) ? error.failure : parseThrownFailure(error);
}

function isUnavailableStatus(status: number | undefined): boolean {
  return status === 403 || status === 404 || status === 422;
}

export function AiTutorContent({ conversationId }: AiTutorContentProps) {
  const router = useRouter();
  const { protectedRequest } = useAuth();
  const [conversations, setConversations] = useState<TutorConversationListResponse | null>(null);
  const [listErrorMessage, setListErrorMessage] = useState<string | undefined>();
  const [listRetryAttempt, setListRetryAttempt] = useState(0);
  const [listState, setListState] = useState<AiTutorListState>("loading");
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | undefined>();
  const [detailRetryAttempt, setDetailRetryAttempt] = useState(0);
  const [detailState, setDetailState] = useState<AiTutorDetailState>(
    conversationId ? "loading" : "new",
  );
  const [createRetryAttempt, setCreateRetryAttempt] = useState(0);
  const [deleteRetryAttempt, setDeleteRetryAttempt] = useState(0);
  const [selectedConversation, setSelectedConversation] =
    useState<TutorConversationDetailResponse | null>(null);
  const isActiveRef = useRef(true);
  const createdConversationIdRef = useRef<string | null>(null);
  const listRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);
  const sendControllersRef = useRef(new Map<string, AbortController>());

  const requestListPage = useCallback(
    (page: number, onRetryScheduled?: (info: TutorRetryScheduled) => void) =>
      executeTutorRequest(
        () =>
          protectedRequest(() =>
            listTutorConversations({
              query: {
                page,
                page_size: AI_TUTOR_PAGE_SIZE,
              },
            }),
          ),
        { onRetryScheduled },
      ),
    [protectedRequest],
  );

  const requestDetail = useCallback(
    (id: string, onRetryScheduled?: (info: TutorRetryScheduled) => void) =>
      executeTutorRequest(
        () =>
          protectedRequest(() =>
            getTutorConversation({
              path: {
                conversation_id: id,
              },
            }),
          ),
        { onRetryScheduled },
      ),
    [protectedRequest],
  );

  const requestMessage = useCallback(
    (
      conversationId: string,
      request: TutorMessageCreateRequest,
      onRetryScheduled?: (info: TutorRetryScheduled) => void,
      signal?: AbortSignal,
    ) =>
      executeTutorRequest(
        () =>
          protectedRequest(() =>
            sendTutorMessage({
              body: request,
              path: {
                conversation_id: conversationId,
              },
              signal,
            }),
          ),
        { onRetryScheduled, signal },
      ),
    [protectedRequest],
  );

  const loadList = useCallback(async () => {
    if (!isActiveRef.current) {
      return;
    }

    const requestId = ++listRequestIdRef.current;
    setListState("loading");
    setListErrorMessage(undefined);
    setListRetryAttempt(0);
    setConversations(null);

    try {
      const result: ListRequestResult = await requestListPage(1, ({ attempt }) => {
        setListRetryAttempt(attempt);
      });

      if (!isActiveRef.current || requestId !== listRequestIdRef.current) {
        return;
      }

      if (result.data) {
        setConversations(result.data);
        setListState("ready");
        return;
      }

      const failure = parseApiFailure(result);
      setListErrorMessage(failure.message);
      setListState("error");
    } catch (error) {
      if (!isActiveRef.current || requestId !== listRequestIdRef.current) {
        return;
      }

      setListErrorMessage(getTutorFailure(error).message);
      setListState("error");
    } finally {
      if (requestId === listRequestIdRef.current) {
        setListRetryAttempt(0);
      }
    }
  }, [requestListPage]);

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
        const result: DetailRequestResult = await requestDetail(id, ({ attempt }) => {
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

  const invalidateDetailRequest = useCallback(() => {
    ++detailRequestIdRef.current;
  }, []);

  const createConversation = useCallback(
    async (request: TutorConversationCreateRequest): Promise<TutorConversationCreateResponse> => {
      setCreateRetryAttempt(0);
      const result = await executeTutorRequest(
        () => protectedRequest(() => createTutorConversation({ body: request })),
        {
          onRetryScheduled: ({ attempt }) => setCreateRetryAttempt(attempt),
        },
      );

      if (!result.data) {
        throw new Error(parseApiFailure(result).message);
      }

      const createdConversation = result.data;
      const latestMessage = (createdConversation.messages ?? []).at(-1);
      const listItem: TutorConversationListItem = {
        conversation_id: createdConversation.conversation_id,
        topic: createdConversation.topic,
        difficulty: createdConversation.difficulty,
        scenario: createdConversation.scenario,
        explanation_language: createdConversation.explanation_language,
        status: createdConversation.status,
        last_message_text: latestMessage?.text ?? null,
        updated_at: latestMessage?.created_at ?? createdConversation.started_at,
      };

      createdConversationIdRef.current = createdConversation.conversation_id;
      setSelectedConversation(createdConversation);
      setDetailErrorMessage(undefined);
      setDetailState("ready");

      if (listState === "ready" && conversations) {
        setConversations((current) => {
          if (
            !current ||
            current.items.some((item) => item.conversation_id === listItem.conversation_id)
          ) {
            return current;
          }

          const totalItems = current.total_items + 1;
          return {
            ...current,
            items: [listItem, ...current.items],
            total_items: totalItems,
            total_pages: Math.ceil(totalItems / current.page_size),
          };
        });
      } else {
        void loadList();
      }

      router.push(`/ai-tutor/${createdConversation.conversation_id}`);
      return createdConversation;
    },
    [conversations, listState, loadList, protectedRequest, router],
  );

  const sendMessage = useCallback(
    async (
      conversationId: string,
      request: TutorMessageCreateRequest,
      onRetryScheduled?: (info: TutorRetryScheduled) => void,
    ): Promise<TutorMessageCreateResponse> => {
      const controller = new AbortController();
      sendControllersRef.current.set(conversationId, controller);
      let result: SendMessageResult;
      try {
        result = await requestMessage(conversationId, request, onRetryScheduled, controller.signal);
      } catch (error) {
        const failure = getTutorFailure(error);
        if (failure.status === 403 || failure.status === 404) {
          setDetailErrorMessage(failure.message);
          setDetailState("unavailable");
        }
        throw error;
      } finally {
        if (sendControllersRef.current.get(conversationId) === controller) {
          sendControllersRef.current.delete(conversationId);
        }
      }

      if (!result.data) {
        throw new Error(parseApiFailure(result).message);
      }

      const messageResponse = result.data;
      setSelectedConversation((current) => {
        if (!current || current.conversation_id !== conversationId) {
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

      const conversationIsLoaded =
        listState === "ready" &&
        conversations?.items.some((item) => item.conversation_id === conversationId);

      if (!conversationIsLoaded) {
        void loadList();
      } else {
        setConversations((current) => {
          if (!current) {
            return current;
          }

          const currentItem = current.items.find((item) => item.conversation_id === conversationId);
          if (!currentItem) {
            return current;
          }

          const updatedItem = {
            ...currentItem,
            last_message_text: messageResponse.ai_reply.text,
            updated_at: messageResponse.ai_reply.created_at,
          };

          return {
            ...current,
            items: [
              updatedItem,
              ...current.items.filter((item) => item.conversation_id !== conversationId),
            ],
          };
        });
      }

      return messageResponse;
    },
    [conversations, listState, loadList, requestMessage],
  );

  const deleteConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      sendControllersRef.current.get(conversationId)?.abort();
      setDeleteRetryAttempt(0);

      try {
        await executeTutorRequest(
          () =>
            protectedRequest(() =>
              deleteTutorConversation({
                path: {
                  conversation_id: conversationId,
                },
              }),
            ),
          {
            isSuccessful: (result) => result.response?.status === 204,
            onRetryScheduled: ({ attempt }) => setDeleteRetryAttempt(attempt),
          },
        );
      } finally {
        setDeleteRetryAttempt(0);
      }

      const conversationIsLoaded = conversations?.items.some(
        (item) => item.conversation_id === conversationId,
      );
      if (conversationIsLoaded) {
        setConversations((current) => {
          if (!current) {
            return current;
          }

          const items = current.items.filter((item) => item.conversation_id !== conversationId);
          const totalItems = Math.max(0, current.total_items - 1);
          return {
            ...current,
            items,
            total_items: totalItems,
            total_pages: totalItems ? Math.ceil(totalItems / current.page_size) : 0,
          };
        });
      } else {
        void loadList();
      }
      setSelectedConversation(null);
      setDetailErrorMessage(undefined);
      setDetailState("new");
      router.replace("/ai-tutor");
    },
    [conversations, loadList, protectedRequest, router],
  );

  useEffect(() => {
    isActiveRef.current = true;
    const loadTimer = window.setTimeout(() => void loadList(), 0);

    return () => {
      isActiveRef.current = false;
      window.clearTimeout(loadTimer);
    };
  }, [loadList]);

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

      invalidateDetailRequest();
      setDetailErrorMessage(undefined);
      setSelectedConversation(null);
      setDetailState("new");
    }, 0);

    return () => {
      invalidateDetailRequest();
      window.clearTimeout(loadTimer);
    };
  }, [conversationId, invalidateDetailRequest, loadDetail]);

  const loadPage = useCallback(
    async (page: number): Promise<TutorConversationListResponse> => {
      try {
        const result = await requestListPage(page, ({ attempt }) => {
          setListRetryAttempt(attempt);
        });

        if (!result.data) {
          throw new Error(parseApiFailure(result).message);
        }

        return result.data;
      } finally {
        setListRetryAttempt(0);
      }
    },
    [requestListPage],
  );

  const retryDetail = useCallback(() => {
    if (conversationId) {
      void loadDetail(conversationId);
    }
  }, [conversationId, loadDetail]);

  if (listState === "loading" && detailState === (conversationId ? "loading" : "new")) {
    return <AiTutorLoading retryAttempt={Math.max(listRetryAttempt, detailRetryAttempt)} />;
  }

  return (
    <AiTutorScreen
      conversations={conversations}
      createRetryAttempt={createRetryAttempt}
      deleteRetryAttempt={deleteRetryAttempt}
      detailErrorMessage={detailErrorMessage}
      detailRetryAttempt={detailRetryAttempt}
      detailState={detailState}
      listErrorMessage={listErrorMessage}
      listRetryAttempt={listRetryAttempt}
      listState={listState}
      loadPage={loadPage}
      onCreateConversation={createConversation}
      onDeleteConversation={deleteConversation}
      onSendMessage={sendMessage}
      onRetryDetail={retryDetail}
      onRetryList={() => void loadList()}
      selectedConversation={selectedConversation}
    />
  );
}
