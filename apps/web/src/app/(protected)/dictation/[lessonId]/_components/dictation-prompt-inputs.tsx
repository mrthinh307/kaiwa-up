"use client";

import type { DictationPromptInputsProps } from "../../_types/dictation-practice";

import { CIRCLED_BLANK_NUMBERS } from "../../_constants/dictation-constants";
import { DictationBlankInput } from "./dictation-blank-input";

export function DictationPromptInputs({
  answers,
  isSubmitting,
  lesson,
  onAnswerChange,
}: DictationPromptInputsProps) {
  const inputSizeClass =
    lesson.exerciseType === "one_word"
      ? "min-w-28 sm:min-w-36"
      : lesson.exerciseType === "full_sentence"
        ? "min-w-56 sm:min-w-80"
        : "min-w-40 sm:min-w-52";

  return (
    <div className="whitespace-pre-wrap font-heading text-xl leading-[3] sm:text-2xl" lang="ja">
      {lesson.blanks.map((blank, index) => {
        const placeholder =
          CIRCLED_BLANK_NUMBERS.at(blank.blankIndex - 1) ?? `(${blank.blankIndex})`;

        return (
          <span key={blank.blankIndex}>
            {lesson.promptParts.at(index)}
            <DictationBlankInput
              blankIndex={blank.blankIndex}
              disabled={isSubmitting}
              inputSizeClass={inputSizeClass}
              onAnswerChange={onAnswerChange}
              placeholder={placeholder}
              value={answers[blank.blankIndex] ?? ""}
            />
          </span>
        );
      })}
      {lesson.promptParts.at(-1)}
    </div>
  );
}
