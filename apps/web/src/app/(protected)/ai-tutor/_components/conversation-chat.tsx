"use client";

import type {
  TutorAnswerHintResponse,
  TutorConversationDetailResponse,
  TutorFeedbackResponse,
  TutorMessageCreateRequest,
  TutorMessageResponse,
} from "@kaiwa-app/api-client";

import { ChevronDown, Lightbulb, LoaderCircle, RefreshCw, Send } from "lucide-react";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { getMockTutorErrorMessage, sendMockTutorMessage } from "../_mocks/ai-tutor-mock-api";

type ConversationChatProps = {
  conversation: TutorConversationDetailResponse;
};

type TutorMessageProps = {
  message: TutorMessageResponse;
  onHintSelect: (hint: TutorAnswerHintResponse) => void;
};

type MockTurnState = "sending" | "waiting_for_ai" | "success" | "retryable_error";
type TutorComposerState = "draft" | MockTurnState;

type MockTutorTurn = {
  aiReply?: TutorMessageResponse;
  clientMessageId: string;
  errorMessage?: string;
  state: MockTurnState;
  text: string;
  userMessage: TutorMessageResponse;
};

function TutorFeedback({
  feedback,
  onHintSelect,
}: {
  feedback: TutorFeedbackResponse;
  onHintSelect: (hint: TutorAnswerHintResponse) => void;
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
        <details className="group rounded-base border-2 border-border bg-background">
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
            {hints.map((hint) => (
              <Button
                className="h-auto justify-start gap-3 whitespace-normal p-3 text-left"
                key={`${hint.text}-${hint.meaning_vi}`}
                onClick={() => onHintSelect(hint)}
                type="button"
                variant="noShadow"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-heading" lang="ja">
                    {hint.text}
                  </span>
                  <span className="mt-1 block text-xs font-normal text-foreground/65">
                    {hint.meaning_vi}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function TutorMessage({ message, onHintSelect }: TutorMessageProps) {
  const isUserMessage = message.sender === "user";

  return (
    <article className={cn("flex", isUserMessage ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "w-full max-w-[760px] rounded-base border-2 border-border p-3 shadow-shadow sm:p-4",
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
        {message.text_vi ? (
          <p
            className={cn(
              "mt-3 border-t-2 pt-3 text-sm leading-relaxed",
              isUserMessage
                ? "border-main-foreground/25 text-main-foreground/75"
                : "border-border/60 text-foreground/65",
            )}
          >
            {message.text_vi}
          </p>
        ) : null}
        {!isUserMessage && message.feedback ? (
          <TutorFeedback feedback={message.feedback} onHintSelect={onHintSelect} />
        ) : null}
      </div>
    </article>
  );
}

function ConversationComposer({
  isSending,
  onSubmit,
  onChange,
  value,
}: {
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
    if (!normalizedValue || isSending || isComposing || compositionRef.current) {
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
            placeholder={isSending ? "AI Tutor is thinking…" : "Type your answer…"}
            ref={textareaRef}
            rows={1}
            value={value}
          />
        </div>
        <Button
          aria-label={isSending ? "Sending message" : "Send message"}
          disabled={!value.trim() || isSending || isComposing}
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

function MockAiResponseState({
  errorMessage,
  onRetry,
  state,
}: {
  errorMessage?: string;
  onRetry: () => void;
  state: MockTurnState;
}) {
  if (state === "success") {
    return null;
  }

  const isError = state === "retryable_error";
  const label = state === "sending" ? "Sending your answer" : "AI Tutor is thinking";

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

function waitForMockTurnPhase() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 300);
  });
}

export function ConversationChat({ conversation }: ConversationChatProps) {
  const messageListRef = useRef<HTMLDivElement>(null);
  const nextSequenceRef = useRef(
    Math.max(0, ...(conversation.messages ?? []).map((message) => message.sequence_number)) + 1,
  );
  const [composerValue, setComposerValue] = useState("");
  const [turns, setTurns] = useState<MockTutorTurn[]>([]);
  const messages = [...(conversation.messages ?? [])].sort(
    (left, right) => left.sequence_number - right.sequence_number,
  );
  const isSending = turns.some(
    (turn) => turn.state === "sending" || turn.state === "waiting_for_ai",
  );
  const composerState: TutorComposerState = isSending ? (turns.at(-1)?.state ?? "draft") : "draft";
  const turnStatusKey = turns.map((turn) => `${turn.clientMessageId}:${turn.state}`).join("|");

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) {
      return;
    }

    messageList.scrollTop = messageList.scrollHeight;
  }, [conversation.conversation_id, messages.length, turnStatusKey]);

  function updateTurn(clientMessageId: string, update: Partial<MockTutorTurn>) {
    setTurns((currentTurns) =>
      currentTurns.map((turn) =>
        turn.clientMessageId === clientMessageId ? { ...turn, ...update } : turn,
      ),
    );
  }

  async function processTurn(turn: MockTutorTurn) {
    updateTurn(turn.clientMessageId, { state: "sending" });
    await waitForMockTurnPhase();
    updateTurn(turn.clientMessageId, { state: "waiting_for_ai" });

    const request: TutorMessageCreateRequest = {
      client_message_id: turn.clientMessageId,
      text: turn.text,
    };

    try {
      const aiReply = await sendMockTutorMessage(request, turn.userMessage.sequence_number + 1);
      updateTurn(turn.clientMessageId, { aiReply, state: "success" });
    } catch (error) {
      updateTurn(turn.clientMessageId, {
        errorMessage: getMockTutorErrorMessage(error),
        state: "retryable_error",
      });
    }
  }

  function handleComposerSubmit(text: string) {
    if (isSending) {
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
      text_vi: null,
      client_message_id: clientMessageId,
      created_at: new Date().toISOString(),
      feedback: null,
    };
    const turn: MockTutorTurn = {
      clientMessageId,
      state: "sending",
      text,
      userMessage,
    };

    setTurns((currentTurns) => [...currentTurns, turn]);
    setComposerValue("");
    void processTurn(turn);
  }

  function handleRetry(turn: MockTutorTurn) {
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
        <div className="mx-auto flex w-full max-w-[920px] flex-col gap-6 pb-32 sm:pb-36">
          {messages.map((message) => (
            <TutorMessage key={message.id} message={message} onHintSelect={handleHintSelect} />
          ))}
          {turns.map((turn) => (
            <Fragment key={turn.clientMessageId}>
              <TutorMessage message={turn.userMessage} onHintSelect={handleHintSelect} />
              {turn.aiReply ? (
                <TutorMessage message={turn.aiReply} onHintSelect={handleHintSelect} />
              ) : (
                <MockAiResponseState
                  errorMessage={turn.errorMessage}
                  onRetry={() => handleRetry(turn)}
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
        isSending={isSending}
        onChange={setComposerValue}
        onSubmit={handleComposerSubmit}
        value={composerValue}
      />
      <span className="sr-only" role="status">
        {composerState === "sending" ? "Sending message" : null}
        {composerState === "waiting_for_ai" ? "Waiting for AI response" : null}
      </span>
    </div>
  );
}
