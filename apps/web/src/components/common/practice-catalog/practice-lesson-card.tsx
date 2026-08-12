import { Clock3, Tag } from "lucide-react";

import type { PracticeCatalogLesson } from "@/lib/practice-catalog-mock";

import { Badge } from "@/components/ui/badge";

import { formatPracticeDuration } from "./practice-catalog-formatters";
import { PracticeModeAction } from "./practice-mode-action";

type PracticeLessonCardProps = {
  lesson: PracticeCatalogLesson;
};

export function PracticeLessonCard({ lesson }: PracticeLessonCardProps) {
  return (
    <article className="group flex min-h-[440px] w-full flex-col justify-between bg-secondary-background p-5 sm:p-7">
      <div>
        <div className="flex items-start justify-between gap-4">
          <Badge className="shadow-shadow">{lesson.difficulty}</Badge>
          <span className="flex items-center gap-2 text-sm font-heading">
            <Clock3 aria-hidden="true" className="size-5" />
            {formatPracticeDuration(lesson.audioDurationMs)}
          </span>
        </div>

        <p className="mt-8 flex items-center gap-2 text-sm font-heading tracking-wide text-foreground/65 uppercase">
          <Tag aria-hidden="true" className="size-4" />
          {lesson.topic}
        </p>
        <h3 className="mt-3 line-clamp-2 text-2xl leading-tight sm:text-3xl">{lesson.title}</h3>
        <p className="mt-3 line-clamp-3 max-w-[48ch] text-sm leading-relaxed text-foreground/70 sm:text-base">
          {lesson.shortDescription}
        </p>
      </div>

      <div className="mt-8">
        <p className="mb-3 text-xs font-heading tracking-wide text-foreground/60 uppercase">
          Practice modes
        </p>
        <div className="space-y-2">
          {lesson.modes.map((progress) => (
            <PracticeModeAction
              contentId={lesson.id}
              key={progress.mode}
              lessonTitle={lesson.title}
              progress={progress}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
