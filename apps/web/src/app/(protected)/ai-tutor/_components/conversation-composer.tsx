"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ConversationComposerProps = {
  isBlocked: boolean;
  isSending: boolean;
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
  value: string;
};

export function ConversationComposer({
  isBlocked,
  isSending,
  onChange,
  onSubmit,
  value,
}: ConversationComposerProps) {
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
