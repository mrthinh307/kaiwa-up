import type { LearningContentItem } from "@kaiwa-app/api-client";

import { ArrowRight, Clock3, Headphones, Languages } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function formatDuration(durationSeconds: number | null | undefined): string {
  if (!durationSeconds) {
    return "Self-paced";
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.round(durationSeconds % 60);

  if (minutes === 0) {
    return `${seconds} sec`;
  }

  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} sec`;
}

export function ListeningTranslationCatalog({ lessons }: { lessons: LearningContentItem[] }) {
  if (lessons.length === 0) {
    return (
      <section
        aria-labelledby="listening-translation-catalog-heading"
        className="rounded-base border-4 border-border bg-secondary-background px-6 py-12 text-center shadow-shadow"
      >
        <span className="mx-auto flex size-16 items-center justify-center rounded-full border-4 border-border bg-main text-main-foreground shadow-shadow">
          <Languages aria-hidden="true" className="size-8" />
        </span>
        <h2 className="mt-7 text-2xl" id="listening-translation-catalog-heading">
          Listening lessons are on the way
        </h2>
        <p className="mx-auto mt-3 max-w-[560px] leading-relaxed text-foreground/70">
          Translation exercises will appear here after they are published by the content team.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="listening-translation-catalog-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-heading tracking-wide text-foreground/60 uppercase">
            Practice catalog
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl" id="listening-translation-catalog-heading">
            Choose a listening exercise
          </h2>
        </div>
        <Badge variant="neutral">{lessons.length} lessons</Badge>
      </div>

      <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {lessons.map((lesson) => (
          <li className="flex" key={lesson.id}>
            <Card className="w-full bg-secondary-background">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge>{lesson.difficulty}</Badge>
                  <span className="flex items-center gap-1.5 text-xs font-heading text-foreground/65">
                    <Clock3 aria-hidden="true" className="size-4" />
                    {formatDuration(lesson.duration_seconds)}
                  </span>
                </div>
                <CardTitle className="pt-4 text-xl leading-snug sm:text-2xl">
                  {lesson.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1">
                <p className="line-clamp-3 text-sm leading-relaxed text-foreground/70">
                  {lesson.description ??
                    "Listen carefully, understand the Japanese message, and translate it into Vietnamese."}
                </p>
                {lesson.topic ? (
                  <p className="mt-4 flex items-center gap-2 text-xs font-heading tracking-wide uppercase">
                    <Headphones aria-hidden="true" className="size-4" />
                    {lesson.topic}
                  </p>
                ) : null}
              </CardContent>

              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/listening-translation/${encodeURIComponent(lesson.id)}`}>
                    Start translating
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
