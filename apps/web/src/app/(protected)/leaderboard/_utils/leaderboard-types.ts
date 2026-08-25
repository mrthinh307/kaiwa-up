export type LeaderboardEntry = {
  avatarUrl: string | null;
  displayName: string;
  rank: number;
  userId: string;
  weeklyExp: number;
};

export type WeeklyLeaderboardViewModel = {
  rankings: LeaderboardEntry[];
  userRank: LeaderboardEntry | null;
  weekNumber: number;
  year: number;
};
