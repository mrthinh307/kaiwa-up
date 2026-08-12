import { Trophy } from "lucide-react";

import type { DashboardViewModel } from "../_utils/dashboard-mock-adapter";

import { formatDashboardNumber } from "../_utils/dashboard-formatters";

export function DashboardLevelProgress({
  gamification,
}: {
  gamification: DashboardViewModel["gamification"];
}) {
  const progressMaximum = Math.max(
    gamification.nextLevelMinExp - gamification.currentLevelMinExp,
    1,
  );
  const progressValue = Math.min(
    Math.max(gamification.totalExp - gamification.currentLevelMinExp, 0),
    progressMaximum,
  );

  return (
    <section
      aria-labelledby="dashboard-level-heading"
      className="flex h-full flex-col overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow"
    >
      <div className="flex items-center justify-between gap-5 border-b-4 border-border bg-main p-5 text-main-foreground sm:p-7">
        <div>
          <p className="text-xs font-heading uppercase tracking-[0.14em]">Current level</p>
          <h2 className="mt-2 text-4xl leading-none sm:text-5xl" id="dashboard-level-heading">
            Level {gamification.level}
          </h2>
        </div>
        <span className="flex size-14 shrink-0 items-center justify-center rounded-base border-2 border-border bg-secondary-background text-foreground shadow-shadow sm:size-16">
          <Trophy aria-hidden="true" className="size-7 sm:size-8" />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-7">
        <p className="text-sm text-foreground/70">Total earned</p>
        <p className="mt-1 text-3xl font-heading tabular-nums sm:text-4xl">
          {formatDashboardNumber(gamification.totalExp)} EXP
        </p>

        <div className="mt-8 flex items-end justify-between gap-4 text-sm">
          <p className="font-heading">Progress through Level {gamification.level}</p>
          <p className="tabular-nums text-foreground/70">
            {formatDashboardNumber(progressValue)} / {formatDashboardNumber(progressMaximum)} EXP
          </p>
        </div>
        <progress
          aria-label={`Level ${gamification.level} progress: ${progressValue} of ${progressMaximum} EXP`}
          className="mt-3 h-6 w-full overflow-hidden rounded-full border-2 border-border bg-background [&::-moz-progress-bar]:bg-main [&::-webkit-progress-bar]:bg-background [&::-webkit-progress-value]:bg-main"
          max={progressMaximum}
          value={progressValue}
        />

        <div className="mt-5 border-t-2 border-border pt-5">
          <p className="text-xl font-heading tabular-nums sm:text-2xl">
            {formatDashboardNumber(gamification.expToNextLevel)} EXP to the next level
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/70">
            This level starts at {formatDashboardNumber(gamification.currentLevelMinExp)} EXP. The
            next level starts at {formatDashboardNumber(gamification.nextLevelMinExp)} EXP.
          </p>
        </div>
      </div>
    </section>
  );
}
