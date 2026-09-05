"use client";

import type { ReactNode } from "react";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";

import { ProtectedRouteStatusPanel } from "@/components/common/protected-route/protected-route-status-panel";
import { Button } from "@/components/ui/button";

import type { AiTutorConversationNavigationProps } from "./ai-tutor-conversation-navigation";

import { AiTutorConversationHistorySheet } from "./ai-tutor-conversation-navigation";

type AiTutorWorkspaceStateFrameProps = Omit<
  AiTutorConversationNavigationProps,
  "selectedConversationId"
> & {
  children: ReactNode;
};

export function AiTutorWorkspaceStateFrame({
  children,
  conversations,
  listErrorMessage,
  listRetryAttempt,
  listState,
  loadPage,
  onRetryList,
}: AiTutorWorkspaceStateFrameProps) {
  return (
    <div className="flex min-h-[calc(100dvh-70px)] flex-col items-center justify-center p-5 sm:p-8">
      <div className="mb-4 flex w-full justify-end lg:hidden">
        <AiTutorConversationHistorySheet
          conversations={conversations}
          listErrorMessage={listErrorMessage}
          listRetryAttempt={listRetryAttempt}
          listState={listState}
          loadPage={loadPage}
          onRetryList={onRetryList}
          selectedConversationId={null}
        />
      </div>
      {children}
    </div>
  );
}

export function AiTutorDetailLoadingState({ retryAttempt }: { retryAttempt: number }) {
  return (
    <div
      aria-busy="true"
      className="flex w-full max-w-[680px] flex-col items-center justify-center gap-3 text-center"
    >
      <LoaderCircle aria-hidden="true" className="size-8 animate-spin" />
      <p className="font-heading" role="status">
        {retryAttempt > 0
          ? `Retrying conversation, attempt ${retryAttempt + 1}…`
          : "Loading conversation…"}
      </p>
    </div>
  );
}

export function AiTutorDetailUnavailableState({
  detailErrorMessage,
  isUnavailable,
  onRetry,
}: {
  detailErrorMessage?: string;
  isUnavailable: boolean;
  onRetry: () => void;
}) {
  return (
    <ProtectedRouteStatusPanel
      action={
        <div className="flex flex-wrap justify-center gap-3">
          {!isUnavailable ? <Button onClick={onRetry}>Try again</Button> : null}
          <Button asChild variant="neutral">
            <Link href="/ai-tutor">Back to conversations</Link>
          </Button>
        </div>
      }
      description={
        isUnavailable
          ? "This conversation is no longer available or you do not have access to it."
          : (detailErrorMessage ?? "We could not load this conversation. Try again.")
      }
      title="Conversation unavailable"
      variant="error"
    />
  );
}
