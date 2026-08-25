import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { DashboardViewModel } from "../_utils/dashboard-api-adapter";

import {
  formatDashboardDateTime,
  formatDashboardNumber,
  getDashboardAttemptStatusMetadata,
  getDashboardPracticeModeMetadata,
} from "../_utils/dashboard-formatters";
import { DashboardAttemptFilters } from "./dashboard-attempt-filters";
import { DashboardAttemptPagination } from "./dashboard-attempt-pagination";
import { DashboardEmptyState } from "./dashboard-empty-state";

export function DashboardAttemptHistory({
  attemptHistory,
  totalAttempts,
}: {
  attemptHistory: DashboardViewModel["attemptHistory"];
  totalAttempts: number;
}) {
  const resultStart =
    attemptHistory.total === 0 ? 0 : (attemptHistory.page - 1) * attemptHistory.pageSize + 1;
  const resultEnd = Math.min(attemptHistory.page * attemptHistory.pageSize, attemptHistory.total);
  const activeFilterLabels = [
    attemptHistory.selectedMode
      ? getDashboardPracticeModeMetadata(attemptHistory.selectedMode).label
      : null,
    attemptHistory.selectedStatus
      ? getDashboardAttemptStatusMetadata(attemptHistory.selectedStatus).label
      : null,
    attemptHistory.searchQuery ? `“${attemptHistory.searchQuery}”` : null,
  ].filter((label): label is string => label !== null);

  return (
    <section aria-labelledby="dashboard-attempts-heading" id="attempt-history">
      <div className="rounded-base border-4 border-border bg-background p-5 shadow-shadow sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground shadow-shadow">
                <History aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-xs font-heading uppercase tracking-[0.14em]">Practice log</p>
                <h2 className="mt-1 text-2xl sm:text-3xl" id="dashboard-attempts-heading">
                  Attempt history
                </h2>
              </div>
            </div>
            <p className="mt-4 max-w-[680px] leading-relaxed text-foreground/70">
              Review when and how you practiced. Filters change the history below, not your lifetime
              totals.
            </p>
          </div>

          <p aria-live="polite" className="shrink-0 text-sm font-heading tabular-nums">
            Showing {formatDashboardNumber(resultStart)}–{formatDashboardNumber(resultEnd)} of{" "}
            {formatDashboardNumber(attemptHistory.total)}{" "}
            {attemptHistory.total === 1 ? "attempt" : "attempts"}
            {activeFilterLabels.length > 0 ? ` · ${activeFilterLabels.join(" · ")}` : ""}
          </p>
        </div>

        <DashboardAttemptFilters
          mode={attemptHistory.selectedMode}
          searchQuery={attemptHistory.searchQuery}
          selectedStatus={attemptHistory.selectedStatus}
        />
      </div>

      {attemptHistory.items.length > 0 ? (
        <>
          <div className="mt-4 overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow">
            <div className="hidden grid-cols-[minmax(0,1.55fr)_minmax(130px,0.85fr)_minmax(120px,0.7fr)_minmax(100px,0.55fr)_minmax(170px,0.9fr)] gap-4 border-b-4 border-border bg-main px-5 py-3 text-sm font-heading text-main-foreground lg:grid">
              <span>Lesson</span>
              <span>Practice mode</span>
              <span>Status</span>
              <span>Score</span>
              <span>Completed at</span>
            </div>

            <ol>
              {attemptHistory.items.map((attempt) => {
                const practiceMetadata = getDashboardPracticeModeMetadata(attempt.practiceMode);
                const PracticeIcon = practiceMetadata.icon;
                const statusMetadata = getDashboardAttemptStatusMetadata(attempt.status);
                const StatusIcon = statusMetadata.icon;

                return (
                  <li
                    className="grid grid-cols-2 gap-5 border-b-2 border-border p-5 last:border-b-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(130px,0.85fr)_minmax(120px,0.7fr)_minmax(100px,0.55fr)_minmax(170px,0.9fr)] lg:items-center lg:gap-4"
                    key={attempt.id}
                  >
                    <div className="col-span-2 min-w-0 lg:col-span-1">
                      <p className="text-xs font-heading uppercase tracking-[0.12em] text-foreground/60 lg:hidden">
                        Lesson
                      </p>
                      <p className="mt-1 font-heading leading-snug lg:mt-0 lg:text-lg">
                        {attempt.contentTitle}
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-heading uppercase tracking-[0.12em] text-foreground/60 lg:hidden">
                        Practice mode
                      </p>
                      <Badge
                        className={cn(
                          "gap-1.5 rounded-none font-heading",
                          practiceMetadata.badgeClassName,
                        )}
                      >
                        <PracticeIcon aria-hidden="true" />
                        {practiceMetadata.label}
                      </Badge>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-heading uppercase tracking-[0.12em] text-foreground/60 lg:hidden">
                        Status
                      </p>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-base border-2 border-border px-2.5 py-1 text-sm font-heading",
                          statusMetadata.badgeClassName,
                        )}
                      >
                        <StatusIcon aria-hidden="true" className="size-4" />
                        {statusMetadata.label}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-heading uppercase tracking-[0.12em] text-foreground/60 lg:hidden">
                        Score
                      </p>
                      <p className="mt-1 font-heading tabular-nums lg:mt-0">
                        {attempt.score === null
                          ? "Not scored"
                          : formatDashboardNumber(attempt.score)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-heading uppercase tracking-[0.12em] text-foreground/60 lg:hidden">
                        Completed at
                      </p>
                      {attempt.completedAt ? (
                        <time
                          className="mt-1 block text-sm leading-relaxed lg:mt-0"
                          dateTime={attempt.completedAt}
                        >
                          {formatDashboardDateTime(attempt.completedAt)}
                        </time>
                      ) : (
                        <p className="mt-1 text-sm text-foreground/65 lg:mt-0">Not completed</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <DashboardAttemptPagination
            mode={attemptHistory.selectedMode}
            page={attemptHistory.page}
            pages={attemptHistory.pages}
            searchQuery={attemptHistory.searchQuery}
            status={attemptHistory.selectedStatus}
          />
        </>
      ) : (
        <DashboardEmptyState
          mode={attemptHistory.selectedMode}
          searchQuery={attemptHistory.searchQuery}
          selectedStatus={attemptHistory.selectedStatus}
          totalAttempts={totalAttempts}
        />
      )}
    </section>
  );
}
