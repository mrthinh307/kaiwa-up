"use client";

import type {
  TutorAnswerHintResponse,
  TutorConversationDetailResponse,
  TutorFeedbackResponse,
  TutorMessageCreateRequest,
  TutorMessageCreateResponse,
  TutorMessageResponse,
} from "@kaiwa-app/api-client";

import {
  Bot,
  ChevronDown,
  Lightbulb,
  LoaderCircle,
  RefreshCw,
  Send,
  UserRound,
} from "lucide-react";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ProtectedUserAvatar } from "@/components/layouts/protected-user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getUserDisplayName } from "@/contexts/auth-context";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

import { isTutorRequestError, type TutorRetryScheduled } from "../_lib/ai-tutor-request";

type ConversationChatProps = {
  conversation: TutorConversationDetailResponse;
  onSendMessage: (
    conversationId: string,
    request: TutorMessageCreateRequest,
    onRetryScheduled?: (info: TutorRetryScheduled) => void,
  ) => Promise<TutorMessageCreateResponse>;
};

type TutorMessageProps = {
  message: TutorMessageResponse;
  onHintSelect?: (hint: TutorAnswerHintResponse) => void;
};

type TutorTurnState = "retrying" | "sending" | "waiting_for_ai" | "retryable_error";
type TutorComposerState = "draft" | TutorTurnState;

type TutorTurn = {
  aiReply?: TutorMessageResponse;
  clientMessageId: string;
  errorMessage?: string;
  isUserMessagePersisted: boolean;
  retryAttempt?: number;
  state: TutorTurnState;
  text: string;
  userMessage: TutorMessageResponse;
};

function TutorFeedback({
  feedback,
  onHintSelect,
}: {
  feedback: TutorFeedbackResponse;
  onHintSelect?: (hint: TutorAnswerHintResponse) => void;
}) {
  const hints = feedback.answer_hints ?? [];
  const hasFeedback = Boolean(
    feedback.grammar_correction || feedback.natural_expression_tip || hints.length,
  );

  if (!hasFeedback) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2">
      {feedback.grammar_correction ? (
        <div className="rounded-base border-2 border-border bg-main/10 p-3">
          <p className="text-xs font-heading uppercase tracking-wide text-foreground/65">
            Grammar correction
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {feedback.grammar_correction}
          </p>
        </div>
      ) : null}

      {feedback.natural_expression_tip ? (
        <div className="rounded-base border-2 border-border bg-background p-3">
          <p className="text-xs font-heading uppercase tracking-wide text-foreground/65">
            Natural expression tip
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {feedback.natural_expression_tip}
          </p>
        </div>
      ) : null}

      {hints.length > 0 ? (
        <details
          className="group scroll-mb-32 rounded-base border-2 border-border bg-background sm:scroll-mb-36"
          onToggle={(event) => {
            if (!event.currentTarget.open) {
              return;
            }

            const details = event.currentTarget;
            const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth";

            window.requestAnimationFrame(() => {
              details.scrollIntoView({ behavior, block: "end" });
            });
          }}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-heading outline-hidden focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Lightbulb aria-hidden="true" className="size-4" />
              Answer hints ({hints.length})
            </span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="grid gap-2 border-t-2 border-border p-2">
            {hints.map((hint) =>
              onHintSelect ? (
                <Button
                  className="h-auto justify-start gap-3 whitespace-normal p-3 text-left"
                  key={`${hint.text}-${hint.text_meaning.language}-${hint.text_meaning.text}`}
                  onClick={() => onHintSelect(hint)}
                  type="button"
                  variant="noShadow"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-heading" lang="ja">
                      {hint.text}
                    </span>
                    <span className="mt-1 block text-xs font-normal text-foreground/65">
                      {hint.text_meaning.text}
                    </span>
                  </span>
                </Button>
              ) : (
                <div
                  className="rounded-base border-2 border-border bg-secondary-background p-3"
                  key={`${hint.text}-${hint.text_meaning.language}-${hint.text_meaning.text}`}
                >
                  <span className="block font-heading" lang="ja">
                    {hint.text}
                  </span>
                  <span className="mt-1 block text-xs text-foreground/65">
                    {hint.text_meaning.text}
                  </span>
                </div>
              ),
            )}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function TutorMessage({ message, onHintSelect }: TutorMessageProps) {
  const { user } = useAuth();
  const isUserMessage = message.sender === "user";

  const userAvatar = user ? (
    <ProtectedUserAvatar
      avatarUrl={user.avatar_url}
      className="size-9 border-2 text-sm"
      displayName={getUserDisplayName(user)}
    />
  ) : (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-border bg-main text-main-foreground shadow-shadow"
    >
      <UserRound className="size-4" />
    </span>
  );

  const aiAvatar = (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-border bg-white text-black shadow-shadow"
    >
      <Bot className="size-4" />
    </span>
  );

  return (
    <article
      className={cn("flex items-end gap-3", isUserMessage ? "justify-end" : "justify-start")}
    >
      {!isUserMessage ? aiAvatar : null}
      <div
        className={cn(
          "min-w-0 w-full max-w-[760px] rounded-base border-2 border-border p-3 shadow-shadow sm:p-4",
          isUserMessage ? "bg-main text-main-foreground" : "bg-secondary-background",
        )}
      >
        <p
          className={cn(
            "whitespace-pre-wrap break-words text-base leading-relaxed",
            isUserMessage ? "text-main-foreground" : "text-foreground",
          )}
          lang="ja"
        >
          {message.text}
        </p>
        {message.text_meaning ? (
          <p
            className={cn(
              "mt-3 border-t-2 pt-3 text-sm leading-relaxed",
              isUserMessage
                ? "border-main-foreground/25 text-main-foreground/75"
                : "border-border/60 text-foreground/65",
            )}
            lang={message.text_meaning.language}
          >
            {message.text_meaning.text}
          </p>
        ) : null}
        {!isUserMessage && message.feedback ? (
          <TutorFeedback feedback={message.feedback} onHintSelect={onHintSelect} />
        ) : null}
      </div>
      {isUserMessage ? userAvatar : null}
    </article>
  );
}

function ConversationComposer({
  isBlocked,
  isSending,
  onSubmit,
  onChange,
  value,
}: {
  isBlocked: boolean;
  isSending: boolean;
  onSubmit: (text: string) => void;
  onChange: (value: string) => void;
  value: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const compositionRef = useRef(false);
  const [isComposing, setIsComposing] = useState(false);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [value]);

  function submitCurrentValue() {
    const normalizedValue = value.trim();
    if (!normalizedValue || isBlocked || isComposing || compositionRef.current) {
      return;
    }

    onSubmit(normalizedValue);
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 pl-5 pr-9 pb-4 sm:pl-8 sm:pr-12 sm:pb-6">
      <form
        aria-label="Message AI Tutor"
        className="pointer-events-auto mx-auto flex min-h-14 w-full max-w-[920px] items-end gap-2 rounded-base border-2 border-border bg-secondary-background p-2 shadow-shadow"
        onSubmit={(event) => {
          event.preventDefault();
          submitCurrentValue();
        }}
      >
        <label className="sr-only" htmlFor="tutor-message-composer">
          Message AI Tutor
        </label>
        <div className="min-w-0 flex-1">
          <Textarea
            className="max-h-40 min-h-10 min-w-0 resize-none overflow-y-auto border-0 bg-transparent px-4 py-2 text-base shadow-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            id="tutor-message-composer"
            maxLength={2000}
            onChange={(event) => onChange(event.target.value)}
            onCompositionEnd={() => {
              compositionRef.current = false;
              setIsComposing(false);
            }}
            onCompositionStart={() => {
              compositionRef.current = true;
              setIsComposing(true);
            }}
            onKeyDown={(event) => {
              if (
                event.key !== "Enter" ||
                event.shiftKey ||
                event.nativeEvent.isComposing ||
                compositionRef.current
              ) {
                return;
              }

              event.preventDefault();
              submitCurrentValue();
            }}
            disabled={isBlocked}
            placeholder={
              isSending
                ? "AI Tutor is thinking…"
                : isBlocked
                  ? "Retry the pending response…"
                  : "Type your answer…"
            }
            ref={textareaRef}
            rows={1}
            value={value}
          />
        </div>
        <Button
          aria-label={isSending ? "Sending message" : "Send message"}
          disabled={!value.trim() || isBlocked || isComposing}
          size="icon"
          type="submit"
        >
          {isSending ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <Send aria-hidden="true" />
          )}
        </Button>
      </form>
    </div>
  );
}

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
            <span className="font-normal text-sm text-foreground/65">{errorMessage}</span>
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

export function ConversationChat({ conversation, onSendMessage }: ConversationChatProps) {
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
        onChange={setComposerValue}
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
