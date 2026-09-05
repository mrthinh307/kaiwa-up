"use client";

import type {
  DictationAttemptReviewResponse,
  DictationCompleteResponse,
} from "@kaiwa-app/api-client";

import { BookOpenCheck, CircleAlert, LoaderCircle, RotateCcw, Trophy } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const scoreFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

type DictationResultSummaryProps = {
  activeReview: DictationAttemptReviewResponse["details"][number];
  attemptNumber: number;
  completion: DictationCompleteResponse;
  isStarting: boolean;
  onTryAgain: () => void;
  startError?: string;
};

export function DictationResultSummary({
  activeReview,
  attemptNumber,
  completion,
  isStarting,
  onTryAgain,
  startError,
}: DictationResultSummaryProps) {
  const isUnanswered = !activeReview.user_answer.trim();
  const activeStatusLabel = activeReview.is_correct
    ? "Correct"
    : isUnanswered
      ? "Unanswered"
      : "Needs review";

  return (
    <section
      aria-labelledby="dictation-result-summary-heading"
      className="rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow sm:p-5"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Trophy aria-hidden="true" className="size-5 text-main" />
          <h3 className="font-heading text-base sm:text-lg" id="dictation-result-summary-heading">
            Result Summary
          </h3>
        </div>
        <Badge className="font-heading text-xs" variant="neutral">
          Attempt {attemptNumber}
        </Badge>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-base border-2 border-border bg-background p-2.5 text-center shadow-2xs">
          <span className="block text-[11px] font-heading uppercase tracking-wide text-foreground/60">
            Score
          </span>
          <span className="mt-0.5 block font-heading text-xl text-main tabular-nums sm:text-2xl">
            {scoreFormatter.format(completion.score)}%
          </span>
        </div>

        <div className="rounded-base border-2 border-status-correct-border bg-status-correct-bg p-2.5 text-center shadow-2xs dark:border-emerald-500/50 dark:bg-emerald-950/30">
          <span className="block text-[11px] font-heading uppercase tracking-wide text-status-correct-text dark:text-emerald-300">
            Correct
          </span>
          <span className="mt-0.5 block font-heading text-xl text-status-correct-text tabular-nums sm:text-2xl dark:text-emerald-300">
            {completion.correct_count}/{completion.total_count}
          </span>
        </div>

        <div className="rounded-base border-2 border-status-review-border bg-status-review-bg p-2.5 text-center shadow-2xs dark:border-amber-500/50 dark:bg-amber-950/30">
          <span className="block text-[11px] font-heading uppercase tracking-wide text-status-review-text dark:text-amber-300">
            Review
          </span>
          <span className="mt-0.5 block font-heading text-xl text-status-review-text tabular-nums sm:text-2xl dark:text-amber-300">
            {completion.total_count - completion.correct_count}
          </span>
        </div>

        <div className="rounded-base border-2 border-border bg-background p-2.5 text-center shadow-2xs">
          <span className="block text-[11px] font-heading uppercase tracking-wide text-foreground/60">
            EXP
          </span>
          <span className="mt-0.5 block font-heading text-xl text-chart-4 tabular-nums sm:text-2xl">
            +{completion.earned_exp}
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between rounded-base border border-border/60 bg-background px-3 py-2 text-xs">
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

      <div className="mt-4 space-y-2">
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
              </kbd>
              {` `}+{` `}
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
