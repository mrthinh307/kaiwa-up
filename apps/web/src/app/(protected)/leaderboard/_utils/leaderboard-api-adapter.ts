import type { LeaderboardUser, WeeklyLeaderboardData } from "@kaiwa-app/api-client";

import type { LeaderboardEntry, WeeklyLeaderboardViewModel } from "./leaderboard-types";

function toLeaderboardEntry(user: LeaderboardUser): LeaderboardEntry {
  return {
    avatarUrl: user.avatar_url,
    displayName: user.display_name ?? "Unknown",
    rank: user.rank,
    userId: user.user_id,
    weeklyExp: user.weekly_exp,
  };
}

function weekNumberAndYearFrom(weekStart: string): { weekNumber: number; year: number } {
  const [yearPart, monthPart, dayPart] = weekStart.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const date = new Date(Date.UTC(year, month - 1, day));
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  if (firstThursday.getUTCDay() !== 4) {
    firstThursday.setUTCDate(
      firstThursday.getUTCDate() + ((4 - firstThursday.getUTCDay() + 7) % 7),
    );
  }
  const weekNumber =
    1 + Math.ceil((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return { weekNumber, year: thursday.getUTCFullYear() };
}

export function adaptWeeklyLeaderboard(data: WeeklyLeaderboardData): WeeklyLeaderboardViewModel {
  const { weekNumber, year } = weekNumberAndYearFrom(data.week_start);
  return {
    rankings: (data.rankings ?? []).map(toLeaderboardEntry),
    userRank: data.user_rank ? toLeaderboardEntry(data.user_rank) : null,
    weekNumber,
    year,
  };
}
