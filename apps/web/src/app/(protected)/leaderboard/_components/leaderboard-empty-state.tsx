import { ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LeaderboardEmptyState() {
  return (
    <section
      aria-labelledby="leaderboard-empty-heading"
      className="flex h-full flex-col items-start justify-center rounded-base border-4 border-border bg-secondary-background p-6 shadow-shadow sm:p-9"
    >
      <span className="flex size-14 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground shadow-shadow">
        <Trophy aria-hidden="true" className="size-7" />
      </span>
      <h2 className="mt-7 text-2xl sm:text-3xl" id="leaderboard-empty-heading">
        No one has earned EXP this week yet.
      </h2>
      <p className="mt-3 max-w-[560px] leading-relaxed text-foreground/70">
        Complete a lesson and become the first learner on this week&apos;s board.
      </p>
      <Button asChild className="mt-7 h-11">
        <Link href="/lessons">
          Start practicing
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
