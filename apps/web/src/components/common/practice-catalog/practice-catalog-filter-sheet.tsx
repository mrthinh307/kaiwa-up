"use client";

import { BookOpenCheck, Check, Filter, Mic2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { PracticeLearningStatus, PracticeMode } from "@/lib/practice-catalog-mock";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PRACTICE_MODES } from "@/lib/practice-catalog-mock";
import { buildPracticeCatalogHref, serializePracticeModes } from "@/lib/practice-catalog-query";
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
  selectedModes: readonly PracticeMode[];
  selectedTopic?: string;
  topics: readonly string[];
};

const MODE_DETAILS: Record<
  PracticeMode,
  { description: string; icon: typeof Mic2; label: string }
> = {
  shadowing: {
    description: "Speak along with the audio to build fluency....",
    icon: Mic2,
    label: "Shadowing",
  },
  dictation: {
    description: "Listen closely and write everything what you hear.",
    icon: BookOpenCheck,
    label: "Dictation",
  },
};

export function PracticeCatalogFilterSheet({
  searchQuery,
  selectedDifficulty,
  selectedLearningStatus,
  selectedModes,
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
  const [draftModes, setDraftModes] = useState<PracticeMode[]>([...selectedModes]);
  const [draftTopic, setDraftTopic] = useState<string | undefined>(selectedTopic);
  const topicOptions = topics.map((topic) => ({ label: topic, value: topic }));
  const activeFilterCount =
    Number(Boolean(selectedDifficulty)) +
    Number(Boolean(selectedLearningStatus)) +
    Number(Boolean(selectedTopic)) +
    Number(selectedModes.length !== PRACTICE_MODES.length);

  const resetDraft = () => {
    setDraftDifficulty(selectedDifficulty);
    setDraftLearningStatus(selectedLearningStatus);
    setDraftModes([...selectedModes]);
    setDraftTopic(selectedTopic);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetDraft();
    }

    setIsOpen(nextOpen);
  };

  const handleModeChange = (mode: PracticeMode, checked: boolean) => {
    setDraftModes((currentModes) => {
      if (checked) {
        return currentModes.includes(mode) ? currentModes : [...currentModes, mode];
      }

      if (currentModes.length === 1) {
        return currentModes;
      }

      return currentModes.filter((currentMode) => currentMode !== mode);
    });
  };

  const handleApply = () => {
    startTransition(() => {
      router.push(
        buildPracticeCatalogHref({
          basePath: "/lessons",
          params: {
            difficulty: draftDifficulty,
            learning_status: draftLearningStatus,
            modes: serializePracticeModes(draftModes),
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
    setDraftModes([...PRACTICE_MODES]);
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
            Refine the lesson library by learning status, level, topic, or practice mode.
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

          <fieldset>
            <legend className="mb-3 text-sm font-heading">Practice mode</legend>
            <div className="grid gap-3">
              {PRACTICE_MODES.map((mode) => {
                const details = MODE_DETAILS[mode];
                const Icon = details.icon;
                const checkboxId = `lessons-mode-${mode}`;

                return (
                  <label
                    className="flex min-h-14 cursor-pointer items-center gap-3 rounded-base border-2 border-border bg-background px-3 py-2 transition-colors hover:bg-main/20 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                    htmlFor={checkboxId}
                    key={mode}
                  >
                    <Checkbox
                      checked={draftModes.includes(mode)}
                      id={checkboxId}
                      onCheckedChange={(checked) => handleModeChange(mode, checked === true)}
                    />
                    <Icon aria-hidden="true" className="size-5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-heading">{details.label}</span>
                      <span className="block text-xs text-foreground/70">
                        {details.description}
                      </span>
                    </span>
                    {draftModes.includes(mode) && <Check aria-hidden="true" className="size-4" />}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-foreground/70">Select at least one practice mode.</p>
          </fieldset>
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
