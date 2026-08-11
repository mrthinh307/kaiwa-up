import { History } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import type {
  DashboardAttemptStatus,
  DashboardPracticeMode,
} from "../_utils/dashboard-mock-adapter";

import { getDashboardPracticeModeMetadata } from "../_utils/dashboard-formatters";

export function DashboardEmptyState({
  selectedPracticeMode,
  selectedStatus,
  searchQuery,
  totalAttempts,
}: {
  searchQuery?: string;
  selectedPracticeMode?: DashboardPracticeMode;
  selectedStatus?: DashboardAttemptStatus;
  totalAttempts: number;
}) {
  const isFilteredEmpty =
    totalAttempts > 0 && Boolean(selectedPracticeMode || selectedStatus || searchQuery);
  const practiceMetadata = selectedPracticeMode
    ? getDashboardPracticeModeMetadata(selectedPracticeMode)
    : null;

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
          : "Complete a Shadowing or Dictation lesson and your attempt will appear here."}
      </p>
      <div className="mt-7 flex w-full max-w-[460px] flex-col justify-center gap-3 sm:flex-row">
        {isFilteredEmpty ? (
          <>
            <Button asChild variant="neutral">
              <Link href="/dashboard#attempt-history">Clear filters</Link>
            </Button>
            {practiceMetadata ? (
              <Button asChild>
                <Link href={practiceMetadata.listHref}>Start {practiceMetadata.label}</Link>
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Button asChild>
              <Link href="/shadowing">Start Shadowing</Link>
            </Button>
            <Button asChild variant="neutral">
              <Link href="/dictation">Try Dictation</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
