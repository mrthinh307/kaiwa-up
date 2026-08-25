import type { DashboardAttemptStatus, DashboardPracticeMode } from "./dashboard-api-adapter";

const DASHBOARD_PRACTICE_MODES = [
  "shadowing",
  "dictation",
  "reflex",
  "listening_translation",
] as const satisfies readonly DashboardPracticeMode[];

const DASHBOARD_ATTEMPT_STATUSES = ["completed", "in_progress"] as const;

export function buildDashboardHref({
  mode,
  page,
  searchQuery,
  status,
}: {
  mode?: DashboardPracticeMode;
  page?: number;
  searchQuery?: string;
  status?: DashboardAttemptStatus;
} = {}): string {
  const searchParams = new URLSearchParams();

  if (mode) {
    searchParams.set("mode", mode);
  }
  if (page && page > 1) {
    searchParams.set("page", String(page));
  }
  if (searchQuery) {
    searchParams.set("q", searchQuery);
  }
  if (status) {
    searchParams.set("status", status);
  }

  const query = searchParams.toString();

  return query ? `/dashboard?${query}` : "/dashboard";
}

export function parseDashboardAttemptStatus(
  value: string | undefined,
): DashboardAttemptStatus | undefined {
  return DASHBOARD_ATTEMPT_STATUSES.find((status) => status === value);
}

export function parseDashboardPage(value: string | undefined): number {
  if (!value) {
    return 1;
  }

  const parsedPage = Number.parseInt(value, 10);

  return Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

export function parseDashboardPracticeMode(
  value: string | undefined,
): DashboardPracticeMode | undefined {
  return DASHBOARD_PRACTICE_MODES.find((practiceMode) => practiceMode === value);
}

export function parseDashboardSearchQuery(value: string | undefined): string | undefined {
  const normalizedQuery = value?.trim().replace(/\s+/g, " ");

  return normalizedQuery ? normalizedQuery.slice(0, 100) : undefined;
}
