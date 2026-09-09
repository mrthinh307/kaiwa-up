"use client";

import type { DictationCompleteResponse } from "@kaiwa-app/api-client";

import { Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const scoreFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

type DictationResultBannerProps = {
  attemptNumber: number;
  completion: DictationCompleteResponse;
};

export function DictationResultBanner({ attemptNumber, completion }: DictationResultBannerProps) {
  const incorrectCount = completion.total_count - completion.correct_count;

  return (
    <section
      aria-labelledby="dictation-result-banner-heading"
      className="rounded-base border-2 border-border bg-secondary-background p-3.5 shadow-shadow sm:p-4"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-2">
          <Trophy aria-hidden="true" className="size-5 text-main" />
          <h2
            className="font-heading text-sm text-foreground sm:text-base"
            id="dictation-result-banner-heading"
          >
            Result Summary
          </h2>
        </div>
        <Badge className="font-heading text-xs" variant="neutral">
          Attempt {attemptNumber}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
            {incorrectCount}
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
    </section>
  );
}
