import { History } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import type {
  DashboardAttemptStatus,
  DashboardPracticeMode,
} from "../_utils/dashboard-api-adapter";

export function DashboardEmptyState({
  mode,
  searchQuery,
  selectedStatus,
  totalAttempts,
}: {
  mode?: DashboardPracticeMode;
  searchQuery?: string;
  selectedStatus?: DashboardAttemptStatus;
  totalAttempts: number;
}) {
  const isFilteredEmpty = totalAttempts > 0 && Boolean(mode || selectedStatus || searchQuery);

  return (
    <div className="mt-4 flex min-h-80 flex-col items-center justify-center rounded-base border-4 border-border bg-secondary-background px-6 py-12 text-center shadow-shadow">
      <span className="flex size-16 items-center justify-center rounded-full border-4 border-border bg-main text-main-foreground shadow-shadow">
        <History aria-hidden="true" className="size-8" />
      </span>
      <h3 className="mt-7 text-2xl sm:text-3xl">
        {isFilteredEmpty ? "No matching attempts" : "Your practice history starts here"}
      </h3>
      <p className="mt-3 max-w-[560px] leading-relaxed text-foreground/70">
        {isFilteredEmpty
          ? "Try another lesson title, practice mode, or status to find a previous attempt."
          : "Complete a practice lesson and your attempt will appear here."}
      </p>
      <div className="mt-7 flex w-full max-w-[460px] flex-col justify-center gap-3 sm:flex-row">
        {isFilteredEmpty ? (
          <Button asChild variant="neutral">
            <Link href="/dashboard#attempt-history">Clear filters</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/lessons">Browse lessons</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
