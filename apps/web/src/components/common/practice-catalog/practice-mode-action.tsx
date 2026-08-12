import type { LucideIcon } from "lucide-react";

import { ArrowRight, BookOpenCheck, Mic2, RotateCcw } from "lucide-react";
import Link from "next/link";

import type { LessonModeProgress, PracticeMode } from "@/lib/practice-catalog-mock";

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
};

export function PracticeModeAction({ contentId, lessonTitle, progress }: PracticeModeActionProps) {
  const config = PRACTICE_MODE_CONFIG[progress.mode];
  const hasAttempts = progress.attemptCount > 0;
  const attemptLabel = `${progress.attemptCount} ${progress.attemptCount === 1 ? "attempt" : "attempts"}`;
  const actionLabel = hasAttempts ? "Practice again" : "Start lesson";
  const Icon = config.icon;

  return (
    <Link
      aria-label={`${actionLabel}: ${config.label} for ${lessonTitle}. ${attemptLabel}.`}
      className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-base border-2 border-border bg-background px-3 py-2 outline-hidden transition-colors hover:bg-main hover:text-main-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
      href={config.getHref(contentId)}
    >
      <span className="flex size-9 items-center justify-center rounded-base border-2 border-border bg-secondary-background text-foreground shadow-shadow">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-heading">{config.label}</span>
        <span className="block text-xs opacity-70">{attemptLabel}</span>
      </span>
      <span className="flex items-center justify-end gap-2 text-right text-sm font-heading">
        <span className="text-xs sm:text-sm">{actionLabel}</span>
        {hasAttempts ? (
          <RotateCcw aria-hidden="true" className="size-4" />
        ) : (
          <ArrowRight aria-hidden="true" className="size-4" />
        )}
      </span>
    </Link>
  );
}
