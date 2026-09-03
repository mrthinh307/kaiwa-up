import type { ReflexLessonItem } from "@kaiwa-app/api-client";

import { ArrowRight, CheckCircle2, Mic, RotateCcw, Timer, Zap } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type ReflexLessonCardProps = {
  lesson: ReflexLessonItem;
};

export function ReflexLessonCard({ lesson }: ReflexLessonCardProps) {
  return (
    <Card className="group flex h-full flex-col justify-between border-2 bg-secondary-background transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge>{lesson.difficulty}</Badge>
            <span className="flex items-center gap-1 rounded-base border border-border bg-background px-2 py-0.5 text-xs font-heading text-foreground/75">
              <Timer aria-hidden="true" className="size-3.5 text-main-foreground" />
              3s limit
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
        <p className="text-sm leading-relaxed text-foreground/70">
          Listen to the Japanese prompt and speak your natural response before the 3-second timer
          runs out.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-heading uppercase text-foreground/65">
          <span className="flex items-center gap-1">
            <Mic aria-hidden="true" className="size-3.5" /> Voice
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Zap aria-hidden="true" className="size-3.5" /> AI Feedback
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Button asChild className="w-full" variant={lesson.is_completed ? "neutral" : "default"}>
          <Link href={`/reflex/${lesson.id}`}>
            {lesson.is_completed ? "Practice again" : "Start practice"}
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
