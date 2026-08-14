"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { DictationBlankInputProps } from "../../_types/dictation-practice";

import { useBlankMultiline } from "../../_hooks/use-blank-multiline";

export function DictationBlankInput({
  blankIndex,
  disabled,
  inputSizeClass,
  onAnswerChange,
  placeholder,
  value,
}: DictationBlankInputProps) {
  const { isMultiLine, textareaRef } = useBlankMultiline(value);
  const inputId = `dictation-blank-${blankIndex}`;

  return (
    <>
      <Label className="sr-only" htmlFor={inputId}>
        Blank {blankIndex}
      </Label>
      <Textarea
        aria-label={`Blank ${blankIndex}`}
        autoComplete="off"
        className={cn(
          "mx-1.5 inline-block min-h-10 w-auto max-w-full resize-none overflow-hidden rounded-none border-0 border-b-2 border-border bg-transparent px-2 py-0 font-heading text-xl leading-10 align-middle shadow-none outline-none [field-sizing:content] placeholder:text-foreground/45 focus-visible:border-b-0 focus-visible:ring-2 focus-visible:ring-ring sm:mx-2 sm:text-2xl",
          isMultiLine ? "text-left placeholder:text-left" : "text-center placeholder:text-center",
          inputSizeClass,
        )}
        disabled={disabled}
        id={inputId}
        lang="ja"
        maxLength={160}
        onChange={(event) => onAnswerChange(blankIndex, event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.nativeEvent.isComposing) {
            return;
          }

          event.preventDefault();
          document.getElementById(`dictation-blank-${blankIndex + 1}`)?.focus();
        }}
        placeholder={placeholder}
        ref={textareaRef}
        rows={1}
        spellCheck={false}
        value={value}
        wrap="soft"
      />
    </>
  );
}
