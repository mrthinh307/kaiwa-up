"use client";

import type { TutorMessageCreateRequest, TutorMessageCreateResponse } from "@kaiwa-app/api-client";

import { useCallback } from "react";

import type { TutorRetryScheduled } from "../_lib/ai-tutor-request";

import { useTutorConversation } from "../_hooks/use-tutor-conversation";
import { useTutorConversations } from "../_hooks/use-tutor-conversations";
import { AiTutorLoading } from "./ai-tutor-loading";
import { AiTutorScreen } from "./ai-tutor-screen";

type AiTutorContentProps = {
  conversationId: string | null;
};

export function AiTutorContent({ conversationId }: AiTutorContentProps) {
  const detail = useTutorConversation({ conversationId });
  const list = useTutorConversations({
    onBeforeDelete: detail.cancelMessageRequest,
    onConversationCreated: detail.acceptCreatedConversation,
    onConversationDeleted: detail.clearConversation,
  });
  const { sendMessage } = detail;
  const { handleMessageSent } = list;

  const handleSendMessage = useCallback(
    async (
      id: string,
      request: TutorMessageCreateRequest,
      onRetryScheduled?: (info: TutorRetryScheduled) => void,
    ): Promise<TutorMessageCreateResponse> => {
      const messageResponse = await sendMessage(id, request, onRetryScheduled);
      handleMessageSent(id, messageResponse);
      return messageResponse;
    },
    [handleMessageSent, sendMessage],
  );

  if (list.listState === "loading" && detail.detailState === (conversationId ? "loading" : "new")) {
    return (
      <AiTutorLoading retryAttempt={Math.max(list.listRetryAttempt, detail.detailRetryAttempt)} />
    );
  }

  return (
    <AiTutorScreen
      conversations={list.conversations}
      createRetryAttempt={list.createRetryAttempt}
      deleteRetryAttempt={list.deleteRetryAttempt}
      detailErrorMessage={detail.detailErrorMessage}
      detailRetryAttempt={detail.detailRetryAttempt}
      detailState={detail.detailState}
      listErrorMessage={list.listErrorMessage}
      listRetryAttempt={list.listRetryAttempt}
      listState={list.listState}
      loadPage={list.loadPage}
      onCreateConversation={list.createConversation}
      onDeleteConversation={list.deleteConversation}
      onRetryDetail={detail.retryDetail}
      onRetryList={() => void list.loadList()}
      onSendMessage={handleSendMessage}
      selectedConversation={detail.selectedConversation}
    />
  );
}
