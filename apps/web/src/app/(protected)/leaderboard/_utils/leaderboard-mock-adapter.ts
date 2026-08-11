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

const CURRENT_USER_RANK = {
  avatarUrl: null,
  displayName: "Nguyen Van A",
  rank: 5,
  userId: "leader-current-user",
  weeklyExp: 720,
} satisfies LeaderboardEntry;

const LEADERBOARD_RANKINGS = [
  {
    avatarUrl: null,
    displayName: "Hana",
    rank: 1,
    userId: "leader-hana",
    weeklyExp: 1240,
  },
  {
    avatarUrl: null,
    displayName: "Ren",
    rank: 2,
    userId: "leader-ren",
    weeklyExp: 1080,
  },
  {
    avatarUrl: null,
    displayName: "Mika",
    rank: 3,
    userId: "leader-mika",
    weeklyExp: 960,
  },
  {
    avatarUrl: null,
    displayName: "Sora",
    rank: 4,
    userId: "leader-sora",
    weeklyExp: 845,
  },
  CURRENT_USER_RANK,
  {
    avatarUrl: null,
    displayName: "Aiko",
    rank: 6,
    userId: "leader-aiko",
    weeklyExp: 680,
  },
  {
    avatarUrl: null,
    displayName: "Haruto",
    rank: 7,
    userId: "leader-haruto",
    weeklyExp: 620,
  },
  {
    avatarUrl: null,
    displayName: "Emi",
    rank: 8,
    userId: "leader-emi",
    weeklyExp: 540,
  },
  {
    avatarUrl: null,
    displayName: "Takumi",
    rank: 9,
    userId: "leader-takumi",
    weeklyExp: 475,
  },
  {
    avatarUrl: null,
    displayName: "Mai",
    rank: 10,
    userId: "leader-mai",
    weeklyExp: 410,
  },
  {
    avatarUrl: null,
    displayName: "Christopher Watanabe",
    rank: 11,
    userId: "leader-christopher-watanabe",
    weeklyExp: 355,
  },
  {
    avatarUrl: null,
    displayName: "Yui",
    rank: 12,
    userId: "leader-yui",
    weeklyExp: 300,
  },
] satisfies LeaderboardEntry[];

export const weeklyLeaderboardMock = {
  rankings: LEADERBOARD_RANKINGS,
  userRank: CURRENT_USER_RANK,
  weekNumber: 32,
  year: 2026,
} satisfies WeeklyLeaderboardViewModel;
