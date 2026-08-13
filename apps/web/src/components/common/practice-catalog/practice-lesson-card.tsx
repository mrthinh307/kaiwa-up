import { Tag } from "lucide-react";

import type { PracticeCatalogLesson } from "@/lib/practice-catalog-mock";

import { formatPracticeDuration } from "./practice-catalog-formatters";
import { PracticeModeAction } from "./practice-mode-action";
import { YouTubeLessonPreview } from "./youtube-lesson-preview";

type PracticeLessonCardProps = {
  lesson: PracticeCatalogLesson;
  shouldLoadPreviewEagerly?: boolean;
};

export function PracticeLessonCard({
  lesson,
  shouldLoadPreviewEagerly = false,
}: PracticeLessonCardProps) {
  return (
    <article className="group flex h-full w-full flex-col overflow-hidden bg-secondary-background">
      <YouTubeLessonPreview
        difficulty={lesson.difficulty}
        durationLabel={formatPracticeDuration(lesson.audioDurationMs)}
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        shouldLoadThumbnailEagerly={shouldLoadPreviewEagerly}
        youtubeVideoId={lesson.youtubeVideoId}
      />

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div>
          <p className="flex items-center gap-2 text-xs font-heading tracking-wide text-foreground/65 uppercase">
            <Tag aria-hidden="true" className="size-4" />
            {lesson.topic}
          </p>
          <h3 className="mt-2 line-clamp-2 text-xl leading-tight sm:text-2xl">{lesson.title}</h3>
          <p className="mt-2 line-clamp-2 max-w-[48ch] text-sm leading-relaxed text-foreground/70">
            {lesson.shortDescription}
          </p>
        </div>

        <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
          {lesson.modes.map((progress) => (
            <PracticeModeAction
              contentId={lesson.id}
              key={progress.mode}
              lessonTitle={lesson.title}
              progress={progress}
              variant="compact"
            />
          ))}
        </div>
      </div>
    </article>
  );
}
