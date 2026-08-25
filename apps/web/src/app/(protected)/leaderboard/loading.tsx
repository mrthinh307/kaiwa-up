import { LeaderboardSkeleton } from "./_components/leaderboard-skeleton";

export default function LeaderboardLoading() {
  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1300px]">
        <LeaderboardSkeleton />
      </div>
    </main>
  );
}
