import { ArrowRight, BookOpenCheck, ListChecks, Mic2, Zap } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import type { DashboardViewModel } from "../_utils/dashboard-api-adapter";

import { formatDashboardNumber } from "../_utils/dashboard-formatters";
import { buildDashboardHref } from "../_utils/dashboard-query";

const METRIC_CARD_CLASS_NAME =
  "flex min-h-56 flex-col border-b-2 border-border p-5 last:border-b-0 sm:min-h-0 sm:border-r-2 sm:border-b-0 sm:p-6 sm:last:border-r-0";

export function DashboardProgressSummary({
  progressSummary,
}: {
  progressSummary: DashboardViewModel["progressSummary"];
}) {
  const shadowingDictationHref = `${buildDashboardHref({
    mode: "shadowing_dictation",
  })}#attempt-history`;
  const allAttemptsHref = `${buildDashboardHref()}#attempt-history`;

  return (
    <section
      aria-labelledby="dashboard-summary-heading"
      className="flex h-full flex-col overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow"
    >
      <div className="border-b-4 border-border bg-background p-5 sm:p-7">
        <p className="text-xs font-heading uppercase tracking-[0.14em]">Practice overview</p>
        <h2 className="mt-2 text-2xl sm:text-3xl" id="dashboard-summary-heading">
          Your progress at a glance
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/70">
          Authoritative totals across your KaiwaUp practice history.
        </p>
      </div>

      <div className="grid flex-1 sm:grid-cols-3">
        <article className={METRIC_CARD_CLASS_NAME}>
          <span className="flex size-11 items-center justify-center rounded-base border-2 border-border bg-secondary-background text-foreground shadow-shadow">
            <ListChecks aria-hidden="true" className="size-5" />
          </span>
          <p className="mt-7 text-4xl font-heading tabular-nums sm:text-5xl">
            {formatDashboardNumber(progressSummary.totalAttempts)}
          </p>
          <h3 className="mt-2 text-lg leading-tight">Total attempts</h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground/65">Every practice session</p>

          <div className="mt-auto space-y-2 pt-6 text-sm font-heading">
            <p className="flex items-center justify-between gap-3 border-t-2 border-border pt-3">
              <span className="flex items-center gap-2">
                <Mic2 aria-hidden="true" className="size-4" />
                Shadowing &amp; Dictation
              </span>
              <span className="tabular-nums">
                {formatDashboardNumber(progressSummary.shadowingDictationCompleted)}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Zap aria-hidden="true" className="size-4" />
                Reflex
              </span>
              <span className="tabular-nums">
                {formatDashboardNumber(progressSummary.reflexCompleted)}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <BookOpenCheck aria-hidden="true" className="size-4" />
                Listening &amp; Translation
              </span>
              <span className="tabular-nums">
                {formatDashboardNumber(progressSummary.listeningTranslationCompleted)}
              </span>
            </p>
          </div>
        </article>

        <article className={METRIC_CARD_CLASS_NAME}>
          <span className="flex size-11 items-center justify-center rounded-base border-2 border-border bg-chart-1 text-main-foreground shadow-shadow">
            <Mic2 aria-hidden="true" className="size-5" />
          </span>
          <p className="mt-7 text-4xl font-heading tabular-nums sm:text-5xl">
            {formatDashboardNumber(progressSummary.shadowingDictationCompleted)}
          </p>
          <h3 className="mt-2 text-lg leading-tight">Shadowing &amp; Dictation completed</h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground/65">
            Listening and speaking practice
          </p>
          <div className="mt-auto pt-6">
            <Button asChild className="w-full" size="sm" variant="neutral">
              <Link href={shadowingDictationHref}>
                View completed
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </article>

        <article className={METRIC_CARD_CLASS_NAME}>
          <span className="flex size-11 items-center justify-center rounded-base border-2 border-border bg-chart-5 text-main-foreground shadow-shadow">
            <Zap aria-hidden="true" className="size-5" />
          </span>
          <p className="mt-7 text-4xl font-heading tabular-nums sm:text-5xl">
            {formatDashboardNumber(
              progressSummary.reflexCompleted + progressSummary.listeningTranslationCompleted,
            )}
          </p>
          <h3 className="mt-2 text-lg leading-tight">Reflex &amp; Listening completed</h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground/65">
            Quick-response and translation practice
          </p>
          <div className="mt-auto pt-6">
            <Button asChild className="w-full" size="sm" variant="neutral">
              <Link href={allAttemptsHref}>
                View completed
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </article>
      </div>
    </section>
  );
}
