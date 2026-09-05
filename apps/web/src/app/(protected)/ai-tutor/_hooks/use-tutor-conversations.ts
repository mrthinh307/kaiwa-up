"use client";

import type {
  TutorConversationCreateRequest,
  TutorConversationCreateResponse,
  TutorConversationListItem,
  TutorConversationListResponse,
  TutorMessageCreateResponse,
} from "@kaiwa-app/api-client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  createTutorConversation,
  deleteTutorConversation,
  listTutorConversations,
} from "@/lib/api-client";
import { parseApiFailure, type ApiFailure } from "@/lib/api-errors";

import {
  executeTutorRequest,
  isTutorRequestError,
  type TutorRetryScheduled,
} from "../_lib/ai-tutor-request";

const AI_TUTOR_PAGE_SIZE = 20;

function getTutorFailure(error: unknown): ApiFailure {
  return isTutorRequestError(error) ? error.failure : parseApiFailure({ error });
}

type TutorListState = "error" | "loading" | "ready";

type TutorConversationsOptions = {
  onBeforeDelete: (conversationId: string) => void;
  onConversationCreated: (conversation: TutorConversationCreateResponse) => void;
  onConversationDeleted: () => void;
};

export function useTutorConversations({
  onBeforeDelete,
  onConversationCreated,
  onConversationDeleted,
}: TutorConversationsOptions) {
  const router = useRouter();
  const { protectedRequest } = useAuth();
  const [conversations, setConversations] = useState<TutorConversationListResponse | null>(null);
  const [listErrorMessage, setListErrorMessage] = useState<string | undefined>();
  const [listRetryAttempt, setListRetryAttempt] = useState(0);
  const [listState, setListState] = useState<TutorListState>("loading");
  const [createRetryAttempt, setCreateRetryAttempt] = useState(0);
  const [deleteRetryAttempt, setDeleteRetryAttempt] = useState(0);
  const isActiveRef = useRef(true);
  const listRequestIdRef = useRef(0);

  const requestListPage = useCallback(
    (page: number, onRetryScheduled?: (info: TutorRetryScheduled) => void) =>
      executeTutorRequest(
        () =>
          protectedRequest(() =>
            listTutorConversations({
              query: { page, page_size: AI_TUTOR_PAGE_SIZE },
            }),
          ),
        { onRetryScheduled },
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
      const result = await requestListPage(1, ({ attempt }) => {
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

      setListErrorMessage(parseApiFailure(result).message);
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

      onConversationCreated(createdConversation);

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
    [conversations, listState, loadList, onConversationCreated, protectedRequest, router],
  );

  const deleteConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      onBeforeDelete(conversationId);
      setDeleteRetryAttempt(0);

      try {
        await executeTutorRequest(
          () =>
            protectedRequest(() =>
              deleteTutorConversation({
                path: { conversation_id: conversationId },
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
      onConversationDeleted();
      router.replace("/ai-tutor");
    },
    [conversations, loadList, onBeforeDelete, onConversationDeleted, protectedRequest, router],
  );

  const handleMessageSent = useCallback(
    (conversationId: string, messageResponse: TutorMessageCreateResponse) => {
      const conversationIsLoaded =
        listState === "ready" &&
        conversations?.items.some((item) => item.conversation_id === conversationId);

      if (!conversationIsLoaded) {
        void loadList();
        return;
      }

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
    },
    [conversations, listState, loadList],
  );

  useEffect(() => {
    isActiveRef.current = true;
    const loadTimer = window.setTimeout(() => void loadList(), 0);

    return () => {
      isActiveRef.current = false;
      window.clearTimeout(loadTimer);
    };
  }, [loadList]);

  return {
    conversations,
    createConversation,
    createRetryAttempt,
    deleteConversation,
    deleteRetryAttempt,
    handleMessageSent,
    listErrorMessage,
    listRetryAttempt,
    listState,
    loadList,
    loadPage,
  };
}
