"use client";

import { AlertCircle, CalendarClock, Check, ChevronRight, RotateCcw, Zap } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseApiFailure } from "@/lib/api-errors";

import type { DueReview, ReflexLessonList } from "../_lib/reflex-api";

import { listDueReviews, listReflexLessons } from "../_lib/reflex-api";

type CatalogState =
  | { status: "loading" }
  | { message: string; status: "failed" }
  | { dueReviews: DueReview[]; lessons: ReflexLessonList; status: "success" };

function formatDueDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function ReflexCatalog() {
  const [state, setState] = useState<CatalogState>({ status: "loading" });

  const loadCatalog = useCallback(async () => {
    try {
      const [lessonResult, dueResult] = await Promise.all([listReflexLessons(), listDueReviews()]);

      if (!lessonResult.data || !dueResult.data) {
        const failure = parseApiFailure(!lessonResult.data ? lessonResult : dueResult);
        setState({ message: failure.message, status: "failed" });
        return;
      }

      if (!Array.isArray(lessonResult.data.items) || !Array.isArray(dueResult.data.items)) {
        setState({
          message: "The Reflex API returned an outdated response. Restart the API and web servers.",
          status: "failed",
        });
        return;
      }

      setState({ dueReviews: dueResult.data.items, lessons: lessonResult.data, status: "success" });
    } catch {
      setState({
        message: "Unable to load Reflex data. Restart the development servers and try again.",
        status: "failed",
      });
    }
  }, []);

  const handleRetry = () => {
    setState({ status: "loading" });
    void loadCatalog();
  };

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void loadCatalog(), 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadCatalog]);

  if (state.status === "loading") {
    return (
      <p aria-live="polite" className="py-16 text-center font-heading">
        Loading practice lessons...
      </p>
    );
  }

  if (state.status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Unable to load Reflex lessons</AlertTitle>
        <AlertDescription>
          <p>{state.message}</p>
          <Button className="mt-4" onClick={handleRetry} size="sm" variant="neutral">
            <RotateCcw /> Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-10">
      <section aria-labelledby="due-reviews-title">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-2xl font-heading" id="due-reviews-title">
            <CalendarClock className="size-6" /> Due for review today
          </h2>
          <Badge>{state.dueReviews.length}</Badge>
        </div>
        {state.dueReviews.length === 0 ? (
          <div className="rounded-base border-2 border-border bg-secondary-background p-6">
            Nothing is due today. Your review schedule will appear after you complete a Reflex
            lesson.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {state.dueReviews.map((review) => (
              <Card className="gap-4" key={review.lesson_id}>
                <CardHeader>
                  <CardTitle className="text-lg">{review.lesson_title}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-end justify-between gap-4">
                  <div className="text-sm">
                    <p>
                      Last score: <strong>{Math.round(review.last_score)}</strong>
                    </p>
                    <p className="text-foreground/70">Due: {formatDueDate(review.due_at)}</p>
                  </div>
                  <Button asChild size="icon" title="Review this lesson">
                    <Link
                      aria-label={`Review ${review.lesson_title}`}
                      href={`/reflex/${review.lesson_id}`}
                    >
                      <ChevronRight />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="all-reflex-title">
        <h2 className="mb-5 flex items-center gap-2 text-2xl font-heading" id="all-reflex-title">
          <Zap className="size-6" /> All Reflex lessons
        </h2>
        {state.lessons.items.length === 0 ? (
          <p className="border-y-2 border-border py-10 text-center">
            No Reflex lessons are available yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.lessons.items.map((lesson) => (
              <Card className="gap-4" key={lesson.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <Badge variant="neutral">{lesson.difficulty}</Badge>
                    {lesson.is_completed && <Check aria-label="Completed" className="size-5" />}
                  </div>
                  <CardTitle className="pt-3 text-xl leading-snug">{lesson.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={`/reflex/${lesson.id}`}>
                      {lesson.is_completed ? "Practice again" : "Start"}
                      <ChevronRight />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
