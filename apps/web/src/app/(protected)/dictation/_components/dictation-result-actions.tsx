"use client";

import type { DictationAttemptReviewResponse } from "@kaiwa-app/api-client";

import { BookOpenCheck, CircleAlert, LoaderCircle, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DictationResultActionsProps = {
  activeReview: DictationAttemptReviewResponse["details"][number];
  isStarting: boolean;
  onTryAgain: () => void;
  startError?: string;
};

export function DictationResultActions({
  activeReview,
  isStarting,
  onTryAgain,
  startError,
}: DictationResultActionsProps) {
  const isUnanswered = !activeReview.user_answer.trim();
  const activeStatusLabel = activeReview.is_correct
    ? "Correct"
    : isUnanswered
      ? "Unanswered"
      : "Needs review";

  return (
    <section
      aria-label="Dictation practice actions"
      className="rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow sm:p-5"
    >
      <div className="flex items-center justify-between rounded-base border border-border/60 bg-background px-3 py-2 text-xs">
        <span className="text-foreground/75">
          Active: <strong>Segment #{activeReview.segment_index + 1}</strong>
        </span>
        <span
          className={cn(
            "font-heading",
            activeReview.is_correct && "text-status-correct-text dark:text-emerald-300",
            !activeReview.is_correct &&
              !isUnanswered &&
              "text-status-review-text dark:text-amber-300",
            !activeReview.is_correct && isUnanswered && "text-foreground/60",
          )}
        >
          {activeStatusLabel}
        </span>
      </div>

      {startError ? (
        <Alert className="mt-3.5" variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Unable to start another attempt</AlertTitle>
          <AlertDescription>{startError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-3.5 space-y-2">
        <Button
          className="w-full gap-2 font-heading text-sm"
          disabled={isStarting}
          onClick={onTryAgain}
          type="button"
        >
          {isStarting ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <RotateCcw aria-hidden="true" className="size-4" />
          )}
          {isStarting ? "Starting new attempt..." : "Try this lesson again"}
        </Button>

        <Button asChild className="w-full gap-2 font-heading text-sm" variant="neutral">
          <Link href="/lessons">
            <BookOpenCheck aria-hidden="true" className="size-4" />
            Back to lessons
          </Link>
        </Button>
      </div>

      <div className="mt-4 border-t border-border/40 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-foreground/60">
          <span className="font-heading">Shortcuts:</span>
          <div className="flex items-center gap-2">
            <span>
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
                ⎵
              </kbd>{" "}
              Play/Pause
            </span>
            <span>
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
                Ctrl
              </kbd>{" "}
              +{" "}
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
                ←
              </kbd>
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
                →
              </kbd>{" "}
              Navigate
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
