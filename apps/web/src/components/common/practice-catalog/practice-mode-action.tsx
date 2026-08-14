import type { LucideIcon } from "lucide-react";

import { ArrowRight, BookOpenCheck, Mic2, RotateCcw } from "lucide-react";
import Link from "next/link";

import type { LessonModeProgress, PracticeMode } from "@/lib/practice-catalog-api";

import { cn } from "@/lib/utils";

const PRACTICE_MODE_CONFIG: Record<
  PracticeMode,
  { getHref: (contentId: string) => string; icon: LucideIcon; label: string }
> = {
  dictation: {
    getHref: (contentId) => `/dictation/${encodeURIComponent(contentId)}`,
    icon: BookOpenCheck,
    label: "Dictation",
  },
  shadowing: {
    getHref: (contentId) => `/shadowing/${encodeURIComponent(contentId)}`,
    icon: Mic2,
    label: "Shadowing",
  },
};

type PracticeModeActionProps = {
  contentId: string;
  lessonTitle: string;
  progress: LessonModeProgress;
  variant?: "compact" | "default";
};

export function PracticeModeAction({
  contentId,
  lessonTitle,
  progress,
  variant = "default",
}: PracticeModeActionProps) {
  const config = PRACTICE_MODE_CONFIG[progress.mode];
  const hasAttempts = progress.attemptCount > 0;
  const attemptLabel = `${progress.attemptCount} ${progress.attemptCount === 1 ? "attempt" : "attempts"}`;
  const actionLabel = hasAttempts ? "Practice again" : "Start lesson";
  const displayedProgress = hasAttempts ? attemptLabel : "New";
  const Icon = config.icon;
  const isCompact = variant === "compact";

  return (
    <Link
      aria-label={`${actionLabel}: ${config.label} for ${lessonTitle}. ${attemptLabel}.`}
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center rounded-base border-2 border-border bg-background outline-hidden transition-colors hover:bg-main hover:text-main-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none",
        isCompact ? "min-h-14 gap-2 px-2 py-2" : "min-h-16 gap-3 px-3 py-2",
      )}
      href={config.getHref(contentId)}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-base border-2 border-border bg-secondary-background text-foreground shadow-shadow",
          isCompact ? "size-8" : "size-9",
        )}
      >
        <Icon aria-hidden="true" className={isCompact ? "size-4" : "size-5"} />
      </span>
      <span className="min-w-0">
        <span className={cn("block truncate font-heading", isCompact && "text-sm")}>
          {config.label}
        </span>
        <span className="block truncate text-xs opacity-70">{displayedProgress}</span>
      </span>
      <span className="flex items-center justify-end gap-2 text-right text-sm font-heading">
        {!isCompact && <span className="text-xs sm:text-sm">{actionLabel}</span>}
        {hasAttempts ? (
          <RotateCcw aria-hidden="true" className="size-4" />
        ) : (
          <ArrowRight aria-hidden="true" className="size-4" />
        )}
      </span>
    </Link>
  );
}
