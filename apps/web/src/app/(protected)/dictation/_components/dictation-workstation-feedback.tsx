"use client";

import type { DictationSegmentCheckResponse } from "@kaiwa-app/api-client";

import { CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import { DictationDiffViewer } from "./dictation-diff-viewer";

type DictationWorkstationFeedbackProps = {
  activeResult: DictationSegmentCheckResponse;
  showCorrectAnswer: boolean;
};

export function DictationWorkstationFeedback({
  activeResult,
  showCorrectAnswer,
}: DictationWorkstationFeedbackProps) {
  return (
    <div
      aria-live="polite"
      className="border-t-2 border-border bg-background p-4 outline-none sm:p-5"
      id="dictation-segment-feedback"
      tabIndex={-1}
    >
      <div
        className={cn(
          "rounded-base border-2 p-4 shadow-xs",
          activeResult.is_correct
            ? "border-status-correct-border bg-status-correct-bg/60 text-foreground"
            : "border-status-review-border bg-status-review-bg/60 text-foreground",
        )}
      >
        <div className="flex items-start gap-3">
          {activeResult.is_correct ? (
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-status-correct-text"
            />
          ) : (
            <XCircle
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-status-review-text"
            />
          )}
          <div className="flex-1">
            <h3
              className={cn(
                "font-heading text-base sm:text-lg",
                activeResult.is_correct ? "text-status-correct-text" : "text-status-review-text",
              )}
            >
              {activeResult.is_correct
                ? "Correct — nicely heard!"
                : "Not quite — compare and retry"}
            </h3>
            <p className="mt-0.5 text-xs text-foreground/75 sm:text-sm">
              {activeResult.is_correct
                ? "Your answer matches after normalization. Continue to the next segment."
                : showCorrectAnswer
                  ? "Compare the character diff below, replay the audio, and try again."
                  : "Your answer does not match. You can reveal the correct transcript from Settings."}
            </p>
          </div>
        </div>

        {showCorrectAnswer ? (
          <div className="mt-3.5 border-t border-border/30 pt-3">
            <DictationDiffViewer
              correctScript={activeResult.correct_script}
              isCorrect={activeResult.is_correct}
              userAnswer={activeResult.user_answer}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
