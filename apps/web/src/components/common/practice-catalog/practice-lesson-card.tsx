import { ArrowRight, CircleDashed, Clock3, History, RotateCcw, Tag } from "lucide-react";
import Link from "next/link";

import type { PracticeCatalogLesson } from "@/lib/practice-catalog-mock";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { formatPracticeDuration } from "./practice-catalog-formatters";

type PracticeLessonCardProps = {
  href: string;
  lesson: PracticeCatalogLesson;
};

export function PracticeLessonCard({ href, lesson }: PracticeLessonCardProps) {
  const hasAttempts = lesson.attemptCount > 0;
  const attemptLabel = `${lesson.attemptCount} ${lesson.attemptCount === 1 ? "attempt" : "attempts"}`;
  const actionLabel = hasAttempts ? "Practice again" : "Start lesson";

  return (
    <article className="group flex min-h-[360px] w-full flex-col justify-between bg-secondary-background p-5 motion-safe:transition-transform motion-safe:hover:-translate-y-1 sm:p-7">
      <div>
        <div className="flex items-start justify-between gap-4">
          <Badge className="shadow-shadow">{lesson.difficulty}</Badge>
          <span
            className={cn(
              "flex items-center gap-2 rounded-base border-2 border-border px-2.5 py-1 text-sm font-heading",
              hasAttempts ? "bg-chart-3 text-main-foreground" : "bg-background text-foreground",
            )}
          >
            {hasAttempts ? (
              <History aria-hidden="true" className="size-5" />
            ) : (
              <CircleDashed aria-hidden="true" className="size-5" />
            )}
            {attemptLabel}
          </span>
        </div>

        <p className="mt-8 flex items-center gap-2 text-sm font-heading tracking-wide text-foreground/65 uppercase">
          <Tag aria-hidden="true" className="size-4" />
          {lesson.topic}
        </p>
        <h3 className="mt-3 text-2xl leading-tight sm:text-3xl">{lesson.title}</h3>
        <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-foreground/70 sm:text-base">
          {lesson.shortDescription}
        </p>
        <p className="mt-5 flex items-center gap-2 text-sm sm:text-base">
          <Clock3 aria-hidden="true" className="size-5" />
          {formatPracticeDuration(lesson.audioDurationMs)}
        </p>
      </div>

      <Button
        asChild
        className="mt-8 w-full motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-shadow sm:w-fit"
        variant={hasAttempts ? "neutral" : "default"}
      >
        <Link aria-label={`${actionLabel}: ${lesson.title}`} href={href}>
          {actionLabel}
          {hasAttempts ? <RotateCcw aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        </Link>
      </Button>
    </article>
  );
}
