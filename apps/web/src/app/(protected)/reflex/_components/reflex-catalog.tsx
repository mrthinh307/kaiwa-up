"use client";

import { AlertCircle, ArrowRight, CalendarClock, FilterX, RotateCcw, Zap } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseApiFailure } from "@/lib/api-errors";

import type { DueReview, ReflexLessonList } from "../_lib/reflex-api";
import type { ReflexDifficultyFilter, ReflexStatusFilter } from "./reflex-filter-bar";

import { listDueReviews, listReflexLessons } from "../_lib/reflex-api";
import { ReflexDueReviews } from "./reflex-due-reviews";
import { ReflexFilterBar } from "./reflex-filter-bar";
import { ReflexLessonCard } from "./reflex-lesson-card";
import { ReflexMethodGuide } from "./reflex-method-guide";
import { ReflexSkeleton } from "./reflex-skeleton";
import { ReflexStatsOverview } from "./reflex-stats-overview";

type CatalogState =
  | { dueReviews: DueReview[]; lessons: ReflexLessonList; status: "success" }
  | { message: string; status: "failed" }
  | { status: "loading" };

export function ReflexCatalog() {
  const [state, setState] = useState<CatalogState>({ status: "loading" });
  const [difficulty, setDifficulty] = useState<ReflexDifficultyFilter>("all");
  const [status, setStatus] = useState<ReflexStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleResetFilters = () => {
    setDifficulty("all");
    setStatus("all");
    setSearchQuery("");
  };

  const hasActiveFilters =
    difficulty !== "all" || status !== "all" || searchQuery.trim().length > 0;

  const filteredLessons = useMemo(() => {
    if (state.status !== "success") return [];
    return state.lessons.items.filter((lesson) => {
      if (difficulty !== "all" && lesson.difficulty !== difficulty) {
        return false;
      }
      if (status === "completed" && !lesson.is_completed) {
        return false;
      }
      if (status === "uncompleted" && lesson.is_completed) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        if (!lesson.title.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [state, difficulty, status, searchQuery]);

  if (state.status === "loading") {
    return <ReflexSkeleton />;
  }

  if (state.status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>Unable to load Reflex lessons</AlertTitle>
        <AlertDescription>
          <p>{state.message}</p>
          <Button className="mt-4" onClick={handleRetry} size="sm" variant="neutral">
            <RotateCcw aria-hidden="true" /> Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const totalLessons = state.lessons.items.length;
  const completedLessons = state.lessons.items.filter((lesson) => lesson.is_completed).length;
  const dueCount = state.dueReviews.length;

  return (
    <div className="space-y-6">
      {/* Mobile Priority Banner: if reviews are due */}
      {dueCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-base border-2 border-chart-2 bg-chart-2/10 p-3 shadow-shadow lg:hidden">
          <div className="flex items-center gap-2 text-sm font-heading">
            <CalendarClock aria-hidden="true" className="size-4 text-chart-2" />
            <span>
              {dueCount} {dueCount === 1 ? "lesson" : "lessons"} due for review today
            </span>
          </div>
          <Button asChild className="h-7 text-xs" size="sm">
            <Link href={`/reflex/${state.dueReviews[0]?.lesson_id}`}>
              Review <ArrowRight aria-hidden="true" className="size-3" />
            </Link>
          </Button>
        </div>
      )}

      {/* 2-Column Workstation Layout */}
      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* PRIMARY COLUMN: LESSONS (lg:col-span-8) */}
        <section aria-labelledby="all-reflex-title" className="space-y-6 lg:col-span-8">
          {/* Header & Filter Bar */}
          <div className="rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-2xl font-heading" id="all-reflex-title">
                <Zap aria-hidden="true" className="size-6" /> All Reflex lessons
              </h2>
              <Badge variant="neutral">{totalLessons} lessons</Badge>
            </div>

            <ReflexFilterBar
              hasActiveFilters={hasActiveFilters}
              onDifficultyChange={setDifficulty}
              onResetFilters={handleResetFilters}
              onSearchChange={setSearchQuery}
              onStatusChange={setStatus}
              searchQuery={searchQuery}
              selectedDifficulty={difficulty}
              selectedStatus={status}
              totalMatching={filteredLessons.length}
              totalUnfiltered={totalLessons}
            />
          </div>

          {/* Lesson Cards Grid (2 cols on sm+) */}
          {filteredLessons.length === 0 ? (
            <div className="rounded-base border-2 border-border bg-secondary-background px-6 py-12 text-center shadow-shadow">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-border bg-main text-main-foreground shadow-shadow">
                <FilterX aria-hidden="true" className="size-7" />
              </div>
              <h3 className="mt-4 text-xl font-heading">No reflex lessons found</h3>
              <p className="mt-1 text-sm text-foreground/70">
                {hasActiveFilters
                  ? "No lessons match your current filters. Try changing or clearing your filter criteria."
                  : "No Reflex lessons are available yet."}
              </p>
              {hasActiveFilters ? (
                <Button className="mt-4" onClick={handleResetFilters} size="sm" variant="neutral">
                  Clear all filters
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredLessons.map((lesson) => (
                <ReflexLessonCard key={lesson.id} lesson={lesson} />
              ))}
            </div>
          )}
        </section>

        {/* SECONDARY SIDEBAR: WIDGETS (lg:col-span-4) */}
        <aside className="space-y-6 lg:col-span-4 lg:sticky lg:top-6">
          <ReflexDueReviews dueReviews={state.dueReviews} />
          <ReflexStatsOverview
            completedLessons={completedLessons}
            dueCount={dueCount}
            totalLessons={totalLessons}
          />
          <ReflexMethodGuide />
        </aside>
      </div>
    </div>
  );
}
