"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import type { ExpectedTranscriptProps } from "../../_types/dictation-practice";

export function ExpectedTranscript({ lesson, result }: ExpectedTranscriptProps) {
  return (
    <div className="whitespace-pre-wrap font-heading text-xl leading-[3] sm:text-2xl" lang="ja">
      {lesson.blanks.map((blank, index) => {
        const blankResult = result.results.find(
          (resultItem) => resultItem.blankIndex === blank.blankIndex,
        );
        const isCorrect = blankResult?.isCorrect ?? false;
        const userAnswer = blankResult?.userAnswer?.trim();
        const correctAnswer = blankResult?.correctAnswer ?? "";

        return (
          <span key={blank.blankIndex}>
            {lesson.promptParts.at(index)}
            {isCorrect ? (
              <span
                className="mx-1.5 inline-flex items-center gap-1.5 rounded-base border-2 border-border bg-success px-2.5 py-0.5 align-middle font-heading text-lg text-success-foreground shadow-[2px_2px_0px_0px_var(--border)] sm:text-xl"
                title={`Blank ${blank.blankIndex}: Correct`}
              >
                <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
                {correctAnswer}
              </span>
            ) : (
              <span
                className="mx-1.5 my-1 inline-flex flex-wrap items-center gap-1.5 rounded-base border-2 border-border bg-background px-2 py-1 align-middle shadow-[2px_2px_0px_0px_var(--border)]"
                title={`Blank ${blank.blankIndex}: Incorrect`}
              >
                <span className="inline-flex items-center gap-1 rounded-[2px] bg-destructive/15 px-1.5 py-0.5 font-heading text-base text-destructive line-through decoration-destructive decoration-2 sm:text-lg">
                  <XCircle aria-hidden="true" className="size-3.5 shrink-0" />
                  {userAnswer || "(Empty)"}
                </span>

                <span className="font-heading text-sm text-foreground/40">→</span>

                <span className="inline-flex items-center gap-1 rounded-[2px] border border-border bg-success px-2 py-0.5 font-heading text-base text-success-foreground sm:text-lg">
                  <CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0" />
                  {correctAnswer}
                </span>
              </span>
            )}
          </span>
        );
      })}
      {lesson.promptParts.at(-1)}
    </div>
  );
}
