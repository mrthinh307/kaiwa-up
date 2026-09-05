"use client";

import type {
  TutorConversationDetailResponse,
  TutorMessageCreateRequest,
  TutorMessageCreateResponse,
} from "@kaiwa-app/api-client";

import { RefreshCw } from "lucide-react";
import { Fragment } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { type TutorTurnState, useTutorTurns } from "../_hooks/use-tutor-turns";
import { type TutorRetryScheduled } from "../_lib/ai-tutor-request";
import { ConversationComposer } from "./conversation-composer";
import { TutorMessage } from "./tutor-message";

type ConversationChatProps = {
  conversation: TutorConversationDetailResponse;
  onSendMessage: (
    conversationId: string,
    request: TutorMessageCreateRequest,
    onRetryScheduled?: (info: TutorRetryScheduled) => void,
  ) => Promise<TutorMessageCreateResponse>;
};

function AnimatedThinkingDots() {
  return (
    <span aria-hidden="true" className="inline-flex items-baseline gap-0.5">
      <span className="animate-bounce [animation-delay:-300ms]">.</span>
      <span className="animate-bounce [animation-delay:-150ms]">.</span>
      <span className="animate-bounce">.</span>
    </span>
  );
}

function AiResponseState({
  errorMessage,
  onRetry,
  retryAttempt,
  state,
}: {
  errorMessage?: string;
  onRetry: () => void;
  retryAttempt?: number;
  state: TutorTurnState;
}) {
  const isError = state === "retryable_error";
  const label =
    state === "sending"
      ? "Sending your answer"
      : state === "retrying"
        ? `Retrying${retryAttempt ? ` (attempt ${retryAttempt + 1})` : ""}…`
        : "AI Tutor is thinking";

  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 text-base font-heading",
        isError ? "text-destructive" : "text-foreground/65",
      )}
      role="status"
    >
      {isError ? (
        <span className="flex flex-wrap items-center gap-3">
          <span>AI response failed</span>
          {errorMessage ? (
            <span className="text-sm font-normal text-foreground/65">{errorMessage}</span>
          ) : null}
          <Button onClick={onRetry} size="sm" type="button" variant="neutral">
            <RefreshCw aria-hidden="true" />
            Retry
          </Button>
        </span>
      ) : (
        <>
          <span>{label}</span>
          <AnimatedThinkingDots />
        </>
      )}
    </div>
  );
}

export function ConversationChat({ conversation, onSendMessage }: ConversationChatProps) {
  const {
    composerState,
    composerValue,
    handleComposerChange,
    handleComposerSubmit,
    handleHintSelect,
    handleRetry,
    isComposerBlocked,
    isSending,
    messageListRef,
    messages,
    turns,
  } = useTutorTurns({ conversation, onSendMessage });

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        aria-label="Conversation messages"
        className="scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-6 sm:px-8"
        ref={messageListRef}
      >
        <div className={cn("mx-auto flex w-full max-w-[920px] flex-col gap-6", "pb-32 sm:pb-36")}>
          {messages.map((message) => (
            <TutorMessage key={message.id} message={message} onHintSelect={handleHintSelect} />
          ))}
          {turns.map((turn) => (
            <Fragment key={turn.clientMessageId}>
              {!turn.isUserMessagePersisted ? (
                <TutorMessage message={turn.userMessage} onHintSelect={handleHintSelect} />
              ) : null}
              {turn.aiReply ? (
                <TutorMessage message={turn.aiReply} onHintSelect={handleHintSelect} />
              ) : (
                <AiResponseState
                  errorMessage={turn.errorMessage}
                  onRetry={() => handleRetry(turn)}
                  retryAttempt={turn.retryAttempt}
                  state={turn.state}
                />
              )}
            </Fragment>
          ))}
          {messages.length === 0 && turns.length === 0 ? (
            <div className="rounded-base border-2 border-dashed border-border bg-background p-6 text-center">
              <p className="font-heading">No messages yet</p>
              <p className="mt-2 text-sm text-foreground/65">
                The first Tutor message will appear here.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <ConversationComposer
        isBlocked={isComposerBlocked}
        isSending={isSending}
        onChange={handleComposerChange}
        onSubmit={handleComposerSubmit}
        value={composerValue}
      />
      <span className="sr-only" role="status">
        {composerState === "sending" ? "Sending message" : null}
        {composerState === "waiting_for_ai" ? "Waiting for AI response" : null}
        {composerState === "retrying" ? "Retrying message" : null}
      </span>
    </div>
  );
}
