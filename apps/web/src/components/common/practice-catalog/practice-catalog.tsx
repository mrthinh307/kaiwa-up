import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import Link from "next/link";

import type { PracticeCatalogViewModel } from "@/lib/practice-catalog-mock";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  JLPT_DIFFICULTIES,
  type JlptDifficulty,
  type PracticeCatalogOption,
} from "@/types/practice-catalog";

import { PracticeCatalogComboboxFilter } from "./practice-catalog-combobox-filter";
import { PracticeCatalogPagination } from "./practice-catalog-pagination";
import { PracticeCatalogSearch } from "./practice-catalog-search";
import { PracticeLessonCard } from "./practice-lesson-card";

const JLPT_DIFFICULTY_OPTIONS = JLPT_DIFFICULTIES.map((difficulty) => ({
  label: difficulty,
  value: difficulty,
})) satisfies PracticeCatalogOption[];

type PracticeCatalogProps = {
  basePath: string;
  catalog: PracticeCatalogViewModel;
  emptyIcon: LucideIcon;
  featureLabel: string;
  getLessonHref: (lessonId: string) => string;
  idPrefix: string;
  methodGuide: ReactNode;
  searchQuery?: string;
  selectedDifficulty?: JlptDifficulty;
};

export function PracticeCatalog({
  basePath,
  catalog,
  emptyIcon: EmptyIcon,
  featureLabel,
  getLessonHref,
  idPrefix,
  methodGuide,
  searchQuery,
  selectedDifficulty,
}: PracticeCatalogProps) {
  const hasLessons = catalog.items.length > 0;
  const hasActiveFilters = Boolean(searchQuery || selectedDifficulty);
  const resultLabel = catalog.total === 1 ? "1 lesson" : `${catalog.total} lessons`;
  const headingId = `${idPrefix}-catalog-heading`;

  return (
    <section aria-labelledby={headingId}>
      <div className="grid gap-5 rounded-base border-4 border-border bg-background p-5 shadow-shadow sm:p-7 lg:grid-cols-[minmax(220px,1fr)_minmax(0,700px)] lg:items-end">
        <div>
          <h2 className="text-2xl sm:text-3xl" id={headingId}>
            Choose a lesson
          </h2>
          <p aria-live="polite" className="mt-2 text-sm text-foreground/70 sm:text-base">
            {resultLabel}
            {selectedDifficulty ? ` at ${selectedDifficulty}` : " across all levels"}
            {searchQuery ? ` matching “${searchQuery}”` : ""}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-end">
          <PracticeCatalogSearch
            basePath={basePath}
            id={`${idPrefix}-lesson-search`}
            initialQuery={searchQuery}
            key={searchQuery}
            placeholder="Search by title, topic, or description..."
            preservedParams={{ difficulty: selectedDifficulty }}
          />
          <PracticeCatalogComboboxFilter
            allLabel="All levels"
            basePath={basePath}
            emptyMessage="No level found."
            id={`${idPrefix}-difficulty`}
            label="JLPT level"
            options={JLPT_DIFFICULTY_OPTIONS}
            preservedParams={{ q: searchQuery }}
            queryKey="difficulty"
            searchLabel="Search JLPT levels"
            searchPlaceholder="Search levels..."
            value={selectedDifficulty}
          />
        </div>
      </div>

      {methodGuide}

      {hasLessons ? (
        <>
          <ul
            className={cn(
              "mt-4 grid border-l-2 border-t-2 border-border md:grid-cols-2 xl:grid-cols-3",
              catalog.items.length === 1 && "md:w-1/2 md:grid-cols-1 xl:w-1/3 xl:grid-cols-1",
              catalog.items.length === 2 && "xl:w-2/3 xl:grid-cols-2",
            )}
          >
            {catalog.items.map((lesson) => (
              <li className="flex border-b-2 border-r-2 border-border" key={lesson.id}>
                <PracticeLessonCard href={getLessonHref(lesson.id)} lesson={lesson} />
              </li>
            ))}
          </ul>
          <PracticeCatalogPagination
            ariaLabel={`${featureLabel} lesson pages`}
            basePath={basePath}
            page={catalog.page}
            pages={catalog.pages}
            params={{ difficulty: selectedDifficulty, q: searchQuery }}
          />
        </>
      ) : (
        <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-base border-4 border-border bg-secondary-background px-6 py-12 text-center shadow-shadow">
          <span className="flex size-16 items-center justify-center rounded-full border-4 border-border bg-main text-main-foreground shadow-shadow">
            <EmptyIcon aria-hidden="true" className="size-8" />
          </span>
          <h3 className="mt-7 text-2xl">
            {hasActiveFilters ? "No matching lessons" : "Lessons are on the way"}
          </h3>
          <p className="mt-3 max-w-[540px] leading-relaxed text-foreground/70">
            {hasActiveFilters
              ? `Try another title, topic, description, or JLPT level to find a ${featureLabel} lesson.`
              : `New ${featureLabel} lessons are being prepared. Check back soon to start practicing.`}
          </p>
          {hasActiveFilters && (
            <Button asChild className="mt-7" variant="neutral">
              <Link href={basePath}>Clear filters</Link>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
