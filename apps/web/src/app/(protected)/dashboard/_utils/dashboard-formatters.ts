import {
  BookOpenCheck,
  CheckCircle2,
  CirclePlay,
  History,
  Languages,
  Mic2,
  Zap,
  type LucideIcon,
} from "lucide-react";

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
  shadowing: {
    badgeClassName: "bg-chart-1 text-main-foreground",
    icon: Mic2,
    label: "Shadowing",
  },
  dictation: {
    badgeClassName: "bg-chart-2 text-main-foreground",
    icon: BookOpenCheck,
    label: "Dictation",
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
  practiceMode: DashboardPracticeMode | null,
): DashboardPracticeModeMetadata {
  if (practiceMode === null) {
    return {
      badgeClassName: "bg-secondary-background text-foreground",
      icon: History,
      label: "Shadowing & Dictation (Legacy)",
    };
  }
  return DASHBOARD_PRACTICE_MODE_METADATA[practiceMode];
}

export function getDashboardAttemptStatusMetadata(
  status: DashboardAttemptStatus,
): DashboardAttemptStatusMetadata {
  return DASHBOARD_ATTEMPT_STATUS_METADATA[status];
}
