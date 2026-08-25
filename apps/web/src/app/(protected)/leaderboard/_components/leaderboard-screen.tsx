import { CalendarDays, Trophy } from "lucide-react";

import { ProtectedPageHeader } from "@/components/common/protected-route/protected-page-header";

import type { WeeklyLeaderboardViewModel } from "../_utils/leaderboard-types";

import { LeaderboardEmptyState } from "./leaderboard-empty-state";
import { LeaderboardTable } from "./leaderboard-table";
import { LeaderboardTopThree } from "./leaderboard-top-three";
import { LeaderboardUserStanding } from "./leaderboard-user-standing";

type LeaderboardScreenProps = {
  leaderboard: WeeklyLeaderboardViewModel;
};

export function LeaderboardScreen({ leaderboard }: LeaderboardScreenProps) {
  const currentUserId = leaderboard.userRank?.userId ?? null;
  const topThree = leaderboard.rankings.slice(0, 3);
  const remainingRankings = leaderboard.rankings.slice(3);

  return (
    <div className="space-y-8">
      <ProtectedPageHeader
        aside={
          <div className="flex items-center gap-4 border-t-2 border-border pt-5 lg:min-w-64 lg:border-t-0 lg:border-l-2 lg:pt-0 lg:pl-7">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground">
              <CalendarDays aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="font-heading">
                Week {leaderboard.weekNumber} · {leaderboard.year}
              </p>
              <p className="mt-1 text-sm text-foreground/65">Resets every Monday</p>
            </div>
          </div>
        }
        className="border-b-4 border-border pb-8"
        description="Earn EXP through practice and follow your position among this week's most active learners."
        eyebrow="Weekly leaderboard"
        icon={Trophy}
        title="See who's leading this week."
      />

      {topThree.length > 0 ? (
        <LeaderboardTopThree currentUserId={currentUserId} entries={topThree} />
      ) : (
        <LeaderboardEmptyState />
      )}

      <LeaderboardUserStanding userRank={leaderboard.userRank} />

      {remainingRankings.length > 0 ? (
        <LeaderboardTable
          currentUserId={currentUserId}
          entries={remainingRankings}
          totalRankings={leaderboard.rankings.length}
        />
      ) : null}
    </div>
  );
}
