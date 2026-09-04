"use client";

import type { LucideIcon } from "lucide-react";

import { ArrowRight, BookOpenCheck, CirclePlay, Mic2 } from "lucide-react";
import Link from "next/link";

import type { LessonPracticeMethod } from "@/components/common/practice-progress/practice-progress-provider";

import { usePracticeProgress } from "@/components/common/practice-progress/practice-progress-provider";
import { cn } from "@/lib/utils";

const PRACTICE_METHOD_CONFIG: Record<
  LessonPracticeMethod,
  { getHref: (contentId: string, attemptId?: string) => string; icon: LucideIcon; label: string }
> = {
  dictation: {
    getHref: (contentId, attemptId) =>
      attemptId
        ? `/dictation/attempts/${encodeURIComponent(attemptId)}/practice`
        : `/dictation/${encodeURIComponent(contentId)}`,
    icon: BookOpenCheck,
    label: "Dictation",
  },
  shadowing: {
    getHref: (contentId, attemptId) =>
      attemptId
        ? `/shadowing/attempts/${encodeURIComponent(attemptId)}/practice`
        : `/shadowing/${encodeURIComponent(contentId)}`,
    icon: Mic2,
    label: "Shadowing",
  },
};

export function PracticeModeAction({
  contentId,
  lessonTitle,
  method,
}: {
  contentId: string;
  lessonTitle: string;
  method: LessonPracticeMethod;
}) {
  const { errorMessage, isLoading, progressByContentId } = usePracticeProgress();
  const progress = progressByContentId.get(contentId);
  const isInProgress = progress?.activeMethods.includes(method) ?? false;
  const activeAttemptId = progress?.activeAttemptIds[method];
  const hasLegacyInProgress = progress?.hasLegacyInProgress ?? false;
  const config = PRACTICE_METHOD_CONFIG[method];
  const Icon = config.icon;
  const actionLabel = isInProgress ? `Resume ${config.label}` : `Practice ${config.label}`;
  const statusLabel = isLoading
    ? "Checking progress…"
    : errorMessage
      ? "Progress unavailable"
      : isInProgress
        ? "In progress"
        : hasLegacyInProgress
          ? "Legacy attempt"
          : "New practice";

  return (
    <Link
      aria-label={`${actionLabel}: ${lessonTitle}. ${statusLabel}.`}
      className={cn(
        "grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-base border-2 border-border bg-background px-2 py-2 outline-hidden transition-colors hover:bg-main hover:text-main-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none",
        isInProgress && "bg-main/15",
      )}
      href={config.getHref(contentId, activeAttemptId)}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-base border-2 border-border bg-secondary-background text-foreground shadow-shadow",
          statusLabel === "In progress" && "bg-chart-3",
        )}
      >
        <Icon aria-hidden="true" className={cn("size-4")} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-heading">{config.label}</span>
        <span className="block truncate text-xs opacity-70">{statusLabel}</span>
      </span>
      {isInProgress ? (
        <CirclePlay aria-hidden="true" className="size-5" />
      ) : (
        <ArrowRight aria-hidden="true" className="size-5" />
      )}
    </Link>
  );
}
