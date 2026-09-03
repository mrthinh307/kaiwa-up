"use client";

import type { TranslationLessonItem } from "@kaiwa-app/api-client";

import { AlertCircle, FilterX, Headphones } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { parseApiFailure } from "@/lib/api-errors";

import type {
  TranslationDifficultyFilter,
  TranslationStatusFilter,
} from "./listening-translation-filter-bar";

import { requestListeningTranslationLessons } from "../_lib/listening-translation-client";
import { ListeningTranslationCard } from "./listening-translation-card";
import { ListeningTranslationFilterBar } from "./listening-translation-filter-bar";

export function ListeningTranslationCatalog({
  initialLessons,
}: {
  initialLessons: TranslationLessonItem[];
}) {
  const { protectedRequest } = useAuth();
  const [lessons, setLessons] = useState(initialLessons);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [difficulty, setDifficulty] = useState<TranslationDifficultyFilter>("all");
  const [status, setStatus] = useState<TranslationStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isActive = true;

    void protectedRequest(requestListeningTranslationLessons)
      .then((result) => {
        if (!isActive) {
          return;
        }

        if (result.data) {
          setLessons(result.data.items);
          setSyncError(null);
          return;
        }

        setSyncError(parseApiFailure(result).message);
      })
      .catch(() => {
        if (isActive) {
          setSyncError("We could not refresh your completion status.");
        }
      });

    return () => {
      isActive = false;
    };
  }, [protectedRequest]);

  const handleResetFilters = () => {
    setDifficulty("all");
    setStatus("all");
    setSearchQuery("");
  };

  const hasActiveFilters =
    difficulty !== "all" || status !== "all" || searchQuery.trim().length > 0;

  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
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
        const matchesTitle = lesson.title.toLowerCase().includes(query);
        const matchesTopic = lesson.topic?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesTopic) {
          return false;
        }
      }
      return true;
    });
  }, [lessons, difficulty, status, searchQuery]);

  if (lessons.length === 0) {
    return (
      <section
        aria-labelledby="listening-translation-catalog-heading"
        className="rounded-base border-2 border-border bg-secondary-background px-6 py-12 text-center shadow-shadow"
      >
        <span className="mx-auto flex size-16 items-center justify-center rounded-full border-2 border-border bg-main text-main-foreground shadow-shadow">
          <Headphones aria-hidden="true" className="size-8" />
        </span>
        <h2 className="mt-7 text-2xl font-heading" id="listening-translation-catalog-heading">
          Listening lessons are on the way
        </h2>
        <p className="mx-auto mt-3 max-w-[560px] leading-relaxed text-foreground/70">
          Translation exercises will appear here after they are published by the content team.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="listening-translation-catalog-heading" className="space-y-6">
      {syncError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Progress status unavailable</AlertTitle>
          <AlertDescription>
            {syncError} You can still open a lesson from the catalog below.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Header & Filter Bar Container */}
      <div className="rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-heading uppercase tracking-wider text-foreground/60">
              Practice catalog
            </p>
            <h2 className="mt-0.5 text-2xl font-heading" id="listening-translation-catalog-heading">
              Choose a listening exercise
            </h2>
          </div>
          <Badge variant="neutral">{lessons.length} lessons</Badge>
        </div>

        <ListeningTranslationFilterBar
          hasActiveFilters={hasActiveFilters}
          onDifficultyChange={setDifficulty}
          onResetFilters={handleResetFilters}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatus}
          searchQuery={searchQuery}
          selectedDifficulty={difficulty}
          selectedStatus={status}
          totalMatching={filteredLessons.length}
          totalUnfiltered={lessons.length}
        />
      </div>

      {/* 3-Column Lessons Grid or Empty Search State */}
      {filteredLessons.length === 0 ? (
        <div className="rounded-base border-2 border-border bg-secondary-background px-6 py-12 text-center shadow-shadow">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-border bg-main text-main-foreground shadow-shadow">
            <FilterX aria-hidden="true" className="size-7" />
          </div>
          <h3 className="mt-4 text-xl font-heading">No listening lessons found</h3>
          <p className="mt-1 text-sm text-foreground/70">
            {hasActiveFilters
              ? "No lessons match your current filters. Try changing or clearing your filter criteria."
              : "No listening exercises are available yet."}
          </p>
          {hasActiveFilters ? (
            <Button className="mt-4" onClick={handleResetFilters} size="sm" variant="neutral">
              Clear all filters
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLessons.map((lesson) => (
            <ListeningTranslationCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      )}
    </section>
  );
}
