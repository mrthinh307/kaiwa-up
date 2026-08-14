import { CheckCircle2, CirclePlay, Languages, Mic2, Zap, type LucideIcon } from "lucide-react";

import type { DashboardAttemptStatus, DashboardPracticeMode } from "./dashboard-api-adapter";

type DashboardPracticeModeMetadata = {
  badgeClassName: string;
  icon: LucideIcon;
  label: string;
};

type DashboardAttemptStatusMetadata = {
  badgeClassName: string;
  icon: LucideIcon;
  label: string;
};

const DASHBOARD_ATTEMPT_STATUS_METADATA: Record<
  DashboardAttemptStatus,
  DashboardAttemptStatusMetadata
> = {
  completed: {
    badgeClassName: "bg-success text-main-foreground",
    icon: CheckCircle2,
    label: "Completed",
  },
  in_progress: {
    badgeClassName: "bg-chart-3 text-main-foreground",
    icon: CirclePlay,
    label: "In progress",
  },
};

const DASHBOARD_PRACTICE_MODE_METADATA: Record<
  DashboardPracticeMode,
  DashboardPracticeModeMetadata
> = {
  shadowing_dictation: {
    badgeClassName: "bg-chart-1 text-main-foreground",
    icon: Mic2,
    label: "Shadowing & Dictation",
  },
  reflex: {
    badgeClassName: "bg-chart-3 text-main-foreground",
    icon: Zap,
    label: "Reflex",
  },
  listening_translation: {
    badgeClassName: "bg-chart-5 text-main-foreground",
    icon: Languages,
    label: "Listening & Translation",
  },
};

const dashboardDateTimeFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
  timeZoneName: "short",
  year: "numeric",
});

const dashboardNumberFormatter = new Intl.NumberFormat("en");

export function formatDashboardDateTime(value: string): string {
  return dashboardDateTimeFormatter.format(new Date(value));
}

export function formatDashboardNumber(value: number): string {
  return dashboardNumberFormatter.format(value);
}

export function getDashboardPracticeModeMetadata(
  practiceMode: DashboardPracticeMode,
): DashboardPracticeModeMetadata {
  return DASHBOARD_PRACTICE_MODE_METADATA[practiceMode];
}

export function getDashboardAttemptStatusMetadata(
  status: DashboardAttemptStatus,
): DashboardAttemptStatusMetadata {
  return DASHBOARD_ATTEMPT_STATUS_METADATA[status];
}
