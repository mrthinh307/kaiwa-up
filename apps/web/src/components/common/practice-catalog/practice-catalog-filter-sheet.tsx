"use client";

import { Filter, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { PracticeLearningStatus } from "@/lib/practice-catalog-mock";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { buildPracticeCatalogHref } from "@/lib/practice-catalog-query";
import {
  JLPT_DIFFICULTIES,
  type JlptDifficulty,
  type PracticeCatalogOption,
} from "@/types/practice-catalog";

import { PracticeCatalogComboboxFilter } from "./practice-catalog-combobox-filter";

const JLPT_DIFFICULTY_OPTIONS = JLPT_DIFFICULTIES.map((difficulty) => ({
  label: difficulty,
  value: difficulty,
})) satisfies PracticeCatalogOption[];

const LEARNING_STATUS_OPTIONS = [
  { label: "Learned", value: "learned" },
  { label: "Not learned", value: "not_learned" },
] as const;

type PracticeCatalogFilterSheetProps = {
  searchQuery?: string;
  selectedDifficulty?: JlptDifficulty;
  selectedLearningStatus?: PracticeLearningStatus;
  selectedTopic?: string;
  topics: readonly string[];
};

export function PracticeCatalogFilterSheet({
  searchQuery,
  selectedDifficulty,
  selectedLearningStatus,
  selectedTopic,
  topics,
}: PracticeCatalogFilterSheetProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draftDifficulty, setDraftDifficulty] = useState<JlptDifficulty | undefined>(
    selectedDifficulty,
  );
  const [draftLearningStatus, setDraftLearningStatus] = useState<
    PracticeLearningStatus | undefined
  >(selectedLearningStatus);
  const [draftTopic, setDraftTopic] = useState<string | undefined>(selectedTopic);
  const topicOptions = topics.map((topic) => ({ label: topic, value: topic }));
  const activeFilterCount =
    Number(Boolean(selectedDifficulty)) +
    Number(Boolean(selectedLearningStatus)) +
    Number(Boolean(selectedTopic));

  const resetDraft = () => {
    setDraftDifficulty(selectedDifficulty);
    setDraftLearningStatus(selectedLearningStatus);
    setDraftTopic(selectedTopic);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetDraft();
    }

    setIsOpen(nextOpen);
  };

  const handleApply = () => {
    startTransition(() => {
      router.push(
        buildPracticeCatalogHref({
          basePath: "/lessons",
          params: {
            difficulty: draftDifficulty,
            learning_status: draftLearningStatus,
            page: undefined,
            q: searchQuery,
            topic: draftTopic,
          },
        }),
      );
      setIsOpen(false);
    });
  };

  const handleReset = () => {
    setDraftDifficulty(undefined);
    setDraftLearningStatus(undefined);
    setDraftTopic(undefined);
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={isOpen}>
      <SheetTrigger asChild>
        <Button
          aria-label={activeFilterCount ? `Filters, ${activeFilterCount} active` : "Open filters"}
          className="shrink-0"
          type="button"
          variant="neutral"
        >
          <Filter aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-main text-xs text-main-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col overflow-y-auto p-0" side="right">
        <SheetHeader className="border-b-4 border-border p-5 pr-16">
          <SheetTitle>Filter lessons</SheetTitle>
          <SheetDescription>
            Refine the lesson library by learning status, level, or topic.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-7 p-5">
          <PracticeCatalogComboboxFilter
            allLabel="All lessons"
            basePath="/lessons"
            emptyMessage="No learning status found."
            id="lessons-learning-status-filter"
            label="Learning status"
            onValueChange={(value) =>
              setDraftLearningStatus(value as PracticeLearningStatus | undefined)
            }
            options={LEARNING_STATUS_OPTIONS}
            queryKey="learning_status"
            searchLabel="Search learning statuses"
            searchPlaceholder="Search learning statuses..."
            value={draftLearningStatus}
          />

          <PracticeCatalogComboboxFilter
            allLabel="All levels"
            basePath="/lessons"
            emptyMessage="No level found."
            id="lessons-difficulty-filter"
            label="JLPT level"
            onValueChange={(value) => setDraftDifficulty(value as JlptDifficulty | undefined)}
            options={JLPT_DIFFICULTY_OPTIONS}
            queryKey="difficulty"
            searchLabel="Search JLPT levels"
            searchPlaceholder="Search levels..."
            value={draftDifficulty}
          />

          <PracticeCatalogComboboxFilter
            allLabel="All topics"
            basePath="/lessons"
            emptyMessage="No topic found."
            id="lessons-topic-filter"
            label="Topic"
            onValueChange={setDraftTopic}
            options={topicOptions}
            queryKey="topic"
            searchLabel="Search lesson topics"
            searchPlaceholder="Search topics..."
            value={draftTopic}
          />
        </div>

        <div className="flex gap-3 border-t-4 border-border p-5">
          <Button className="flex-1" onClick={handleReset} type="button" variant="neutral">
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
          <Button className="flex-1" disabled={isPending} onClick={handleApply} type="button">
            Apply filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
