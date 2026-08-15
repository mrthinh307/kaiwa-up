import { LibraryBig } from "lucide-react";
import Link from "next/link";

import type { JlptDifficulty } from "@/types/practice-catalog";

import { Button } from "@/components/ui/button";
import {
  type PracticeCatalogViewModel,
  type PracticeLearningStatus,
} from "@/lib/practice-catalog-api";
import { cn } from "@/lib/utils";

import { PracticeCatalogFilterSheet } from "./practice-catalog-filter-sheet";
import { PracticeCatalogPagination } from "./practice-catalog-pagination";
import { PracticeCatalogSearch } from "./practice-catalog-search";
import { PracticeLessonCard } from "./practice-lesson-card";
import { PracticePreviewProvider } from "./practice-preview-provider";

type PracticeCatalogProps = {
  catalog: PracticeCatalogViewModel;
  searchQuery?: string;
  selectedDifficulty?: JlptDifficulty;
  selectedLearningStatus?: PracticeLearningStatus;
  selectedTopic?: string;
  topics: readonly string[];
};

export function PracticeCatalog({
  catalog,
  searchQuery,
  selectedDifficulty,
  selectedLearningStatus,
  selectedTopic,
  topics,
}: PracticeCatalogProps) {
  const hasLessons = catalog.items.length > 0;
  const hasActiveFilters = Boolean(
    searchQuery || selectedDifficulty || selectedLearningStatus || selectedTopic,
  );
  const resultLabel = catalog.total === 1 ? "1 lesson" : `${catalog.total} lessons`;
  const learningStatusLabel = selectedLearningStatus
    ? ` · ${selectedLearningStatus === "learned" ? "Learned" : "Not learned"}`
    : "";

  return (
    <section aria-labelledby="lessons-catalog-heading">
      <div className="grid gap-5 rounded-base border-4 border-border bg-background p-5 shadow-shadow sm:p-7 lg:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.6fr)] lg:items-end">
        <div>
          <h2 className="text-2xl sm:text-3xl" id="lessons-catalog-heading">
            Browse lessons
          </h2>
          <p aria-live="polite" className="mt-2 text-sm text-foreground/70 sm:text-base">
            {resultLabel}
            {selectedDifficulty ? ` at ${selectedDifficulty}` : " across all levels"}
            {selectedTopic ? ` in ${selectedTopic}` : ""}
            {searchQuery ? ` matching “${searchQuery}”` : ""}
            {learningStatusLabel}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <PracticeCatalogSearch
            basePath="/lessons"
            hash="lessons-catalog-heading"
            id="lessons-search"
            initialQuery={searchQuery}
            key={searchQuery}
            placeholder="Search by title, topic, or description..."
            preservedParams={{
              difficulty: selectedDifficulty,
              learning_status: selectedLearningStatus,
              topic: selectedTopic,
            }}
          />
          <PracticeCatalogFilterSheet
            searchQuery={searchQuery}
            selectedDifficulty={selectedDifficulty}
            selectedLearningStatus={selectedLearningStatus}
            selectedTopic={selectedTopic}
            topics={topics}
          />
        </div>
      </div>

      {hasLessons ? (
        <>
          <PracticePreviewProvider>
            <ul
              className={cn(
                "mt-4 grid border-l-2 border-t-2 border-border md:grid-cols-2 xl:grid-cols-3",
                catalog.items.length === 1 && "md:w-1/2 md:grid-cols-1 xl:w-1/3 xl:grid-cols-1",
                catalog.items.length === 2 && "xl:w-2/3 xl:grid-cols-2",
              )}
            >
              {catalog.items.map((lesson, lessonIndex) => (
                <li className="flex border-b-2 border-r-2 border-border" key={lesson.id}>
                  <PracticeLessonCard
                    lesson={lesson}
                    shouldLoadPreviewEagerly={lessonIndex === 0}
                  />
                </li>
              ))}
            </ul>
          </PracticePreviewProvider>
          <PracticeCatalogPagination
            ariaLabel="Lesson catalog pages"
            basePath="/lessons"
            hash="lessons-catalog-heading"
            page={catalog.page}
            pages={catalog.pages}
            params={{
              difficulty: selectedDifficulty,
              learning_status: selectedLearningStatus,
              q: searchQuery,
              topic: selectedTopic,
            }}
          />
        </>
      ) : (
        <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-base border-4 border-border bg-secondary-background px-6 py-12 text-center shadow-shadow">
          <span className="flex size-16 items-center justify-center rounded-full border-4 border-border bg-main text-main-foreground shadow-shadow">
            <LibraryBig aria-hidden="true" className="size-8" />
          </span>
          <h3 className="mt-7 text-2xl">
            {hasActiveFilters ? "No matching lessons" : "Lessons are on the way"}
          </h3>
          <p className="mt-3 max-w-[540px] leading-relaxed text-foreground/70">
            {hasActiveFilters
              ? "Try another title, topic, description, JLPT level, or learning status to find a lesson."
              : "New lessons are being prepared. Check back soon to start practicing."}
          </p>
          {hasActiveFilters && (
            <Button asChild className="mt-7" variant="neutral">
              <Link href="/lessons">Clear filters</Link>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
