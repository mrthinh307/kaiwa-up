import { Medal, Trophy } from "lucide-react";

import { ProtectedUserAvatar } from "@/components/layouts/protected-user-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { LeaderboardEntry } from "../_utils/leaderboard-types";

import { formatLeaderboardExp, formatLeaderboardRank } from "../_utils/leaderboard-formatters";

type LeaderboardTopThreeProps = {
  entries: LeaderboardEntry[];
  currentUserId: string | null;
};

export function LeaderboardTopThree({ entries, currentUserId }: LeaderboardTopThreeProps) {
  return (
    <section
      aria-labelledby="leaderboard-top-three-heading"
      className="overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow"
    >
      <div className="flex items-start justify-between gap-5 border-b-2 border-border p-5 sm:p-7">
        <div>
          <p className="text-xs font-heading uppercase tracking-[0.14em]">Top learners</p>
          <h2 className="mt-2 text-2xl sm:text-3xl" id="leaderboard-top-three-heading">
            This week&apos;s top three
          </h2>
        </div>
        <p className="hidden max-w-52 text-right text-sm leading-relaxed text-foreground/65 sm:block">
          The week&apos;s strongest EXP performances.
        </p>
      </div>

      <ol
        className={cn(
          "grid",
          entries.length > 1 &&
            "lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:grid-rows-2",
        )}
      >
        {entries.map((entry, index) => {
          const isCurrentUser = entry.userId === currentUserId;
          const RankIcon = index === 0 ? Trophy : Medal;
          const hasNextEntry = index < entries.length - 1;
          const rankSurface =
            index === 0 ? "bg-rank-gold" : index === 1 ? "bg-rank-silver" : "bg-rank-bronze";

          return (
            <li
              className={cn(
                "relative flex min-w-0 flex-col overflow-hidden p-5 text-main-foreground sm:p-7",
                rankSurface,
                hasNextEntry && "border-b-2 border-border",
                index === 0 && "min-h-[380px] lg:min-h-[480px]",
                index > 0 && "min-h-[220px]",
                index === 0 && entries.length > 1 && "lg:row-span-2 lg:border-r-2 lg:border-b-0",
                index === 1 && entries.length === 2 && "lg:row-span-2 lg:border-b-0",
                index === 1 && entries.length === 3 && "lg:border-b-2",
              )}
              key={entry.userId}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  aria-label={`Rank ${entry.rank}`}
                  className={cn(
                    "flex items-center justify-center border-2 border-current font-heading",
                    index === 0 ? "size-14 text-xl" : "size-10",
                  )}
                >
                  {formatLeaderboardRank(entry.rank)}
                </span>
                <RankIcon aria-hidden="true" className={index === 0 ? "size-12" : "size-7"} />
              </div>

              {index === 0 ? (
                <>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 bottom-[-0.18em] text-[clamp(9rem,25vw,18rem)] leading-none font-heading opacity-[0.08]"
                  >
                    01
                  </span>
                  <div className="relative mt-auto pt-16">
                    <ProtectedUserAvatar
                      avatarUrl={entry.avatarUrl}
                      className="size-20 border-4 bg-secondary-background text-2xl text-foreground"
                      displayName={entry.displayName}
                    />
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <p className="break-words text-3xl font-heading sm:text-4xl">
                        {entry.displayName}
                      </p>
                      {isCurrentUser ? (
                        <Badge className="shadow-none" variant="neutral">
                          You
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-7 text-4xl font-heading sm:text-5xl">
                      {formatLeaderboardExp(entry.weeklyExp)}
                    </p>
                    <p className="mt-1 text-sm uppercase tracking-[0.14em]">Weekly EXP</p>
                  </div>
                </>
              ) : (
                <div className="mt-auto grid gap-6 pt-10 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProtectedUserAvatar
                      avatarUrl={entry.avatarUrl}
                      className="size-12 border-2 bg-secondary-background text-sm text-foreground"
                      displayName={entry.displayName}
                    />
                    <div className="min-w-0">
                      <p className="break-words text-xl font-heading">{entry.displayName}</p>
                      {isCurrentUser ? (
                        <Badge className="mt-2 shadow-none" variant="neutral">
                          You
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-2xl font-heading sm:text-3xl">
                      {formatLeaderboardExp(entry.weeklyExp)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em]">Weekly EXP</p>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
