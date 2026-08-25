import type { LucideIcon } from "lucide-react";

import { ArrowRight, BookOpenCheck, Languages, Mic2, Zap } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import type { DashboardPracticeMode, DashboardViewModel } from "../_utils/dashboard-api-adapter";

import { formatDashboardNumber } from "../_utils/dashboard-formatters";
import { buildDashboardHref } from "../_utils/dashboard-query";

type PracticeMetric = {
  badgeClassName: string;
  count: number;
  description: string;
  icon: LucideIcon;
  label: string;
  mode: DashboardPracticeMode;
};

export function DashboardProgressSummary({
  progressSummary,
}: {
  progressSummary: DashboardViewModel["progressSummary"];
}) {
  const metrics: readonly PracticeMetric[] = [
    {
      badgeClassName: "bg-chart-1 text-main-foreground",
      count: progressSummary.shadowingCompleted,
      description: "Pronunciation and speaking rhythm",
      icon: Mic2,
      label: "Shadowing",
      mode: "shadowing",
    },
    {
      badgeClassName: "bg-chart-2 text-main-foreground",
      count: progressSummary.dictationCompleted,
      description: "Listening accuracy and transcription",
      icon: BookOpenCheck,
      label: "Dictation",
      mode: "dictation",
    },
    {
      badgeClassName: "bg-chart-3 text-main-foreground",
      count: progressSummary.reflexCompleted,
      description: "Fast response practice",
      icon: Zap,
      label: "Fast Reflex",
      mode: "reflex",
    },
    {
      badgeClassName: "bg-chart-5 text-main-foreground",
      count: progressSummary.listeningTranslationCompleted,
      description: "Comprehension and meaning",
      icon: Languages,
      label: "Translation",
      mode: "listening_translation",
    },
  ];

  return (
    <section
      aria-labelledby="dashboard-summary-heading"
      className="flex h-full flex-col overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow"
    >
      <div className="border-b-4 border-border bg-background p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-heading uppercase tracking-[0.14em]">Practice overview</p>
            <h2 className="mt-2 text-2xl sm:text-3xl" id="dashboard-summary-heading">
              Your progress at a glance
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/70">
              Completed practice by method across your KaiwaUp history.
            </p>
          </div>
          <dl className="shrink-0 rounded-base border-2 border-border bg-secondary-background px-5 py-3 text-right shadow-shadow">
            <dt className="text-xs font-heading uppercase tracking-[0.12em]">Total attempts</dt>
            <dd className="mt-1 text-3xl font-heading tabular-nums">
              {formatDashboardNumber(progressSummary.totalAttempts)}
            </dd>
          </dl>
        </div>

        {progressSummary.legacyShadowingDictationCompleted > 0 ? (
          <p className="mt-5 border-t-2 border-border pt-4 text-sm leading-relaxed text-foreground/70">
            {formatDashboardNumber(progressSummary.legacyShadowingDictationCompleted)} completed{" "}
            legacy{" "}
            {progressSummary.legacyShadowingDictationCompleted === 1
              ? "attempt is"
              : "attempts are"}{" "}
            not assigned to Shadowing or Dictation.
          </p>
        ) : null}
      </div>

      <div className="grid flex-1 sm:grid-cols-2">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const href = `${buildDashboardHref({
            mode: metric.mode,
            status: "completed",
          })}#attempt-history`;

          return (
            <Link
              aria-label={`View completed ${metric.label} attempts`}
              className={cn(
                "block border-b-2 border-border bg-secondary-background outline-hidden transition-colors hover:bg-main/10 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none",
                index % 2 === 0 && "sm:border-r-2",
                index >= metrics.length - 2 && "sm:border-b-0",
                index === metrics.length - 1 && "border-b-0",
              )}
              href={href}
              key={metric.mode}
            >
              <article className="flex min-h-28 items-center gap-4 p-4 sm:min-h-32 sm:p-5">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-base border-2 border-border shadow-shadow",
                    metric.badgeClassName,
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="text-3xl font-heading tabular-nums">
                      {formatDashboardNumber(metric.count)}
                    </p>
                    <h3 className="text-base leading-tight">{metric.label} completed</h3>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-foreground/65">
                    {metric.description}
                  </p>
                </div>

                <span className="flex shrink-0 items-center gap-1 text-xs font-heading">
                  <span className="hidden xl:inline">View</span>
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
