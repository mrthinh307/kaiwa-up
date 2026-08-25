import type { Metadata } from "next";

import { DashboardContent } from "./_components/dashboard-content";
import {
  parseDashboardAttemptStatus,
  parseDashboardPage,
  parseDashboardPracticeMode,
  parseDashboardSearchQuery,
} from "./_utils/dashboard-query";

export const metadata: Metadata = {
  description: "Review your KaiwaUp progress, EXP, level, and recent practice attempts.",
  title: "Dashboard | KaiwaUp",
};

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value.at(0) : value;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const page = parseDashboardPage(getFirstSearchParam(resolvedSearchParams.page));
  const searchQuery = parseDashboardSearchQuery(getFirstSearchParam(resolvedSearchParams.q));
  const status = parseDashboardAttemptStatus(getFirstSearchParam(resolvedSearchParams.status));
  const mode = parseDashboardPracticeMode(getFirstSearchParam(resolvedSearchParams.mode));

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1300px]">
        <DashboardContent mode={mode} page={page} searchQuery={searchQuery} status={status} />
      </div>
    </main>
  );
}
