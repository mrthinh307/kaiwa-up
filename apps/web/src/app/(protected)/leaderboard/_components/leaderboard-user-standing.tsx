import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ProtectedUserAvatar } from "@/components/layouts/protected-user-avatar";
import { Button } from "@/components/ui/button";

import type { LeaderboardEntry } from "../_utils/leaderboard-mock-adapter";

import { formatLeaderboardExp, formatLeaderboardRank } from "../_utils/leaderboard-formatters";

type LeaderboardUserStandingProps = {
  userRank: LeaderboardEntry | null;
};

export function LeaderboardUserStanding({ userRank }: LeaderboardUserStandingProps) {
  return (
    <section
      aria-labelledby="leaderboard-user-standing-heading"
      className="rounded-base border-4 border-border bg-foreground p-5 text-background shadow-shadow sm:p-6"
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <div className="flex items-center justify-between gap-5 sm:col-span-2 lg:col-span-1 lg:border-r-2 lg:border-background/35 lg:pr-7">
          <div>
            <p className="text-xs font-heading uppercase tracking-[0.14em]">Weekly position</p>
            <h2 className="mt-2 text-2xl" id="leaderboard-user-standing-heading">
              Your standing
            </h2>
          </div>
          <span className="flex size-18 shrink-0 items-center justify-center rounded-base border-2 border-border bg-main text-2xl font-heading text-main-foreground">
            {userRank ? formatLeaderboardRank(userRank.rank) : "—"}
          </span>
        </div>

        {userRank ? (
          <div className="flex min-w-0 items-center gap-4">
            <ProtectedUserAvatar
              avatarUrl={userRank.avatarUrl}
              className="size-12 border-2 bg-main text-sm text-main-foreground"
              displayName={userRank.displayName}
            />
            <div className="min-w-0">
              <p className="break-words text-xl font-heading">{userRank.displayName}</p>
              <p className="mt-1 text-sm text-background/70">Keep moving up the board.</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xl font-heading">Not ranked yet</p>
            <p className="mt-1 text-sm text-background/70">
              Your first lesson puts you on the board.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-5 sm:justify-end">
          <div className="shrink-0">
            <p className="text-3xl font-heading">
              {formatLeaderboardExp(userRank?.weeklyExp ?? 0)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-background/70">
              Weekly EXP
            </p>
          </div>
          <Button asChild className="h-11">
            <Link href="/lessons">
              {userRank ? "Practice now" : "Start practicing"}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
