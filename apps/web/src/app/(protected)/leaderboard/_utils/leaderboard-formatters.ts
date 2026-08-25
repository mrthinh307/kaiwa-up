const leaderboardNumberFormatter = new Intl.NumberFormat("en");

export function formatLeaderboardExp(value: number): string {
  return leaderboardNumberFormatter.format(value);
}

export function formatLeaderboardRank(value: number): string {
  return `#${leaderboardNumberFormatter.format(value)}`;
}
