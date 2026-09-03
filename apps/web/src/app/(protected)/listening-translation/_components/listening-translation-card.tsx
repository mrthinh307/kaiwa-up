import type { TranslationLessonItem } from "@kaiwa-app/api-client";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Headphones,
  Languages,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type ListeningTranslationCardProps = {
  lesson: TranslationLessonItem;
};

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

export function ListeningTranslationCard({ lesson }: ListeningTranslationCardProps) {
  return (
    <Card className="group flex h-full flex-col justify-between border-2 bg-secondary-background transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge>{lesson.difficulty}</Badge>
            <span className="flex items-center gap-1 rounded-base border border-border bg-background px-2 py-0.5 text-xs font-heading text-foreground/75">
              <Clock3 aria-hidden="true" className="size-3.5" />
              {formatDuration(lesson.duration_seconds)}
            </span>
          </div>
          {lesson.is_completed ? (
            <Badge className="gap-1 border-success bg-success/20 text-success" variant="neutral">
              <CheckCircle2 aria-hidden="true" className="size-3.5" />
              Completed
            </Badge>
          ) : null}
        </div>
        <CardTitle className="pt-3 text-xl leading-snug sm:text-2xl">{lesson.title}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="line-clamp-3 text-sm leading-relaxed text-foreground/70">
          {lesson.description ??
            "Listen carefully, understand the Japanese message, and translate it into Vietnamese."}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs font-heading uppercase text-foreground/65">
          {lesson.topic ? (
            <>
              <span className="flex items-center gap-1 text-foreground">
                <Headphones aria-hidden="true" className="size-3.5" /> {lesson.topic}
              </span>
              <span>•</span>
            </>
          ) : null}
          <span className="flex items-center gap-1">
            <Languages aria-hidden="true" className="size-3.5" /> Translation
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Sparkles aria-hidden="true" className="size-3.5" /> AI Feedback
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Button asChild className="w-full" variant={lesson.is_completed ? "neutral" : "default"}>
          <Link href={`/listening-translation/${encodeURIComponent(lesson.id)}`}>
            {lesson.is_completed ? "Practice again" : "Start translating"}
            {lesson.is_completed ? (
              <RotateCcw aria-hidden="true" className="size-4" />
            ) : (
              <ArrowRight aria-hidden="true" className="size-4" />
            )}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
