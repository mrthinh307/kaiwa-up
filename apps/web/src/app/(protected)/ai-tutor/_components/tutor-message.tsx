"use client";

import type {
  TutorAnswerHintResponse,
  TutorFeedbackResponse,
  TutorMessageResponse,
} from "@kaiwa-app/api-client";

import { Bot, ChevronDown, Lightbulb, UserRound } from "lucide-react";

import { ProtectedUserAvatar } from "@/components/layouts/protected-user-avatar";
import { Button } from "@/components/ui/button";
import { getUserDisplayName } from "@/contexts/auth-context";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type TutorMessageProps = {
  message: TutorMessageResponse;
  onHintSelect?: (hint: TutorAnswerHintResponse) => void;
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

export function TutorMessage({ message, onHintSelect }: TutorMessageProps) {
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
      className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-border bg-secondary-background shadow-shadow"
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
