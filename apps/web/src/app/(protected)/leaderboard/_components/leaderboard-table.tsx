import { Medal } from "lucide-react";

import { ProtectedUserAvatar } from "@/components/layouts/protected-user-avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type { LeaderboardEntry } from "../_utils/leaderboard-types";

import { formatLeaderboardExp, formatLeaderboardRank } from "../_utils/leaderboard-formatters";

type LeaderboardTableProps = {
  currentUserId: string | null;
  entries: LeaderboardEntry[];
  totalRankings: number;
};

export function LeaderboardTable({ currentUserId, entries, totalRankings }: LeaderboardTableProps) {
  return (
    <section
      aria-labelledby="leaderboard-standings-heading"
      className="overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow"
    >
      <div className="flex flex-col gap-2 border-b-2 border-border p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-heading uppercase tracking-[0.14em]">Top {totalRankings}</p>
          <h2 className="mt-2 text-2xl sm:text-3xl" id="leaderboard-standings-heading">
            Weekly standings
          </h2>
        </div>
        <p className="text-sm text-foreground/65">Ranks 4–{totalRankings}</p>
      </div>

      <Table className="table-fixed border-0">
        <TableCaption className="sr-only">
          KaiwaUp learners ranked by EXP earned during the current week.
        </TableCaption>
        <TableHeader>
          <TableRow className="bg-foreground text-background">
            <TableHead className="w-14 px-2 text-background sm:w-28 sm:px-5">Rank</TableHead>
            <TableHead className="px-2 text-background sm:px-5">Learner</TableHead>
            <TableHead className="w-24 px-2 text-right text-background sm:w-40 sm:px-5">
              Weekly EXP
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;

            return (
              <TableRow
                className={cn(
                  isCurrentUser
                    ? "bg-main text-main-foreground"
                    : "bg-secondary-background text-foreground",
                )}
                key={entry.userId}
              >
                <TableCell className="px-2 font-heading sm:px-5">
                  {formatLeaderboardRank(entry.rank)}
                </TableCell>
                <th className="p-2 text-left align-middle font-base sm:p-4 sm:px-5" scope="row">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <ProtectedUserAvatar
                      avatarUrl={entry.avatarUrl}
                      className="size-8 border-2 text-[10px] sm:size-9 sm:text-xs"
                      displayName={entry.displayName}
                    />
                    <div className="min-w-0">
                      <p className="font-heading sm:text-base">{entry.displayName}</p>
                      {isCurrentUser ? (
                        <Badge className="mt-1 shadow-none" variant="neutral">
                          You
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </th>
                <TableCell className="px-2 text-right font-heading sm:px-5 sm:text-lg">
                  {formatLeaderboardExp(entry.weeklyExp)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-start gap-3 border-t-2 border-border bg-background p-4 sm:items-center sm:px-5">
        <Medal aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-main sm:mt-0" />
        <p className="text-sm leading-relaxed text-foreground/75 sm:text-base">
          Higher weekly EXP ranks first. The leaderboard resets every Monday.
        </p>
      </div>
    </section>
  );
}
