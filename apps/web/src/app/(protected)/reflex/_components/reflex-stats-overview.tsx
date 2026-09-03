import { CalendarClock, CheckCircle2, Layers } from "lucide-react";

import { cn } from "@/lib/utils";

type ReflexStatsOverviewProps = {
  completedLessons: number;
  dueCount: number;
  totalLessons: number;
};

export function ReflexStatsOverview({
  completedLessons,
  dueCount,
  totalLessons,
}: ReflexStatsOverviewProps) {
  const completionPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="flex items-center gap-4 rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow sm:p-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground shadow-[2px_2px_0px_0px_var(--border)]">
          <Layers aria-hidden="true" className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-heading uppercase tracking-[0.12em] text-foreground/65">
            Total Lessons
          </p>
          <p className="mt-0.5 text-2xl font-heading sm:text-3xl">{totalLessons}</p>
          <p className="text-xs text-foreground/70">Reflex scenarios</p>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow sm:p-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-base border-2 border-border bg-success/20 text-success shadow-[2px_2px_0px_0px_var(--border)]">
          <CheckCircle2 aria-hidden="true" className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-heading uppercase tracking-[0.12em] text-foreground/65">
              Completed
            </p>
            <span className="text-xs font-heading text-foreground/60">{completionPercent}%</span>
          </div>
          <p className="mt-0.5 text-2xl font-heading sm:text-3xl">
            {completedLessons}
            <span className="text-base font-base text-foreground/60"> / {totalLessons}</span>
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-border bg-background">
            <div
              className="h-full bg-main transition-all duration-300"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow sm:p-5">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-base border-2 border-border shadow-[2px_2px_0px_0px_var(--border)]",
            dueCount > 0 ? "bg-chart-2 text-main-foreground" : "bg-chart-3 text-main-foreground",
          )}
        >
          <CalendarClock aria-hidden="true" className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-heading uppercase tracking-[0.12em] text-foreground/65">
            SRS Due Today
          </p>
          <p className="mt-0.5 text-2xl font-heading sm:text-3xl">{dueCount}</p>
          <p className="text-xs text-foreground/70">
            {dueCount === 0 ? "All caught up" : "Requires spaced review"}
          </p>
        </div>
      </div>
    </div>
  );
}
