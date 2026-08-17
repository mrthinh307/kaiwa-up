import type { Metadata } from "next";

import { LeaderboardContent } from "./_components/leaderboard-content";

export const metadata: Metadata = {
  description: "See this week's top KaiwaUp learners and your current EXP rank.",
  title: "Weekly leaderboard | KaiwaUp",
};

export default function LeaderboardPage() {
  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1300px]">
        <LeaderboardContent />
      </div>
    </main>
  );
}
