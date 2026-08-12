"use client";

import { BookOpenCheck, Check, Filter, Mic2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PracticeCatalogComboboxFilter } from "@/components/common/practice-catalog/practice-catalog-combobox-filter";
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

import type {
  DashboardAttemptStatus,
  DashboardPracticeMode,
} from "../_utils/dashboard-mock-adapter";

import { buildDashboardHref } from "../_utils/dashboard-query";

const PRACTICE_MODES = [
  "shadowing",
  "dictation",
] as const satisfies readonly DashboardPracticeMode[];

const PRACTICE_MODE_DETAILS: Record<
  DashboardPracticeMode,
  { description: string; icon: typeof Mic2; label: string }
> = {
  dictation: {
    description: "Listen closely and write everything what you hear.",
    icon: BookOpenCheck,
    label: "Dictation",
  },
  shadowing: {
    description: "Speak along with the audio to build fluency....",
    icon: Mic2,
    label: "Shadowing",
  },
};

const ATTEMPT_STATUS_OPTIONS = [
  { label: "Completed", value: "completed" },
  { label: "In progress", value: "in_progress" },
] as const;

type DashboardAttemptFilterSheetProps = {
  searchQuery?: string;
  selectedPracticeMode?: DashboardPracticeMode;
  selectedStatus?: DashboardAttemptStatus;
};

export function DashboardAttemptFilterSheet({
  searchQuery,
  selectedPracticeMode,
  selectedStatus,
}: DashboardAttemptFilterSheetProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draftPracticeModes, setDraftPracticeModes] = useState<DashboardPracticeMode[]>(
    selectedPracticeMode ? [selectedPracticeMode] : [...PRACTICE_MODES],
  );
  const [draftStatus, setDraftStatus] = useState<DashboardAttemptStatus | undefined>(
    selectedStatus,
  );
  const activeFilterCount = Number(Boolean(selectedPracticeMode)) + Number(Boolean(selectedStatus));

  const resetDraft = () => {
    setDraftPracticeModes(selectedPracticeMode ? [selectedPracticeMode] : [...PRACTICE_MODES]);
    setDraftStatus(selectedStatus);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetDraft();
    }

    setIsOpen(nextOpen);
  };

  const handlePracticeModeChange = (mode: DashboardPracticeMode, checked: boolean) => {
    setDraftPracticeModes((currentModes) => {
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
    const practiceMode =
      draftPracticeModes.length === PRACTICE_MODES.length ? undefined : draftPracticeModes[0];

    startTransition(() => {
      router.push(
        buildDashboardHref({
          practiceMode,
          searchQuery,
          status: draftStatus,
        }),
      );
      setIsOpen(false);
    });
  };

  const handleReset = () => {
    setDraftPracticeModes([...PRACTICE_MODES]);
    setDraftStatus(undefined);
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
          <SheetTitle>Filter attempts</SheetTitle>
          <SheetDescription>
            Refine your practice log by mode or completion status.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-7 p-5">
          <fieldset>
            <legend className="mb-3 text-sm font-heading">Practice mode</legend>
            <div className="grid gap-3">
              {PRACTICE_MODES.map((mode) => {
                const details = PRACTICE_MODE_DETAILS[mode];
                const Icon = details.icon;
                const checkboxId = `dashboard-mode-${mode}`;

                return (
                  <label
                    className="flex min-h-14 cursor-pointer items-center gap-3 rounded-base border-2 border-border bg-background px-3 py-2 transition-colors hover:bg-main/20 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                    htmlFor={checkboxId}
                    key={mode}
                  >
                    <Checkbox
                      checked={draftPracticeModes.includes(mode)}
                      id={checkboxId}
                      onCheckedChange={(checked) =>
                        handlePracticeModeChange(mode, checked === true)
                      }
                    />
                    <Icon aria-hidden="true" className="size-5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-heading">{details.label}</span>
                      <span className="block text-xs text-foreground/70">
                        {details.description}
                      </span>
                    </span>
                    {draftPracticeModes.includes(mode) && (
                      <Check aria-hidden="true" className="size-4" />
                    )}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-foreground/70">Select at least one practice mode.</p>
          </fieldset>

          <PracticeCatalogComboboxFilter
            allLabel="All statuses"
            basePath="/dashboard"
            emptyMessage="No attempt status found."
            id="dashboard-attempt-status-filter"
            label="Status"
            onValueChange={(value) => setDraftStatus(value as DashboardAttemptStatus | undefined)}
            options={ATTEMPT_STATUS_OPTIONS}
            queryKey="status"
            searchLabel="Search attempt statuses"
            searchPlaceholder="Search statuses..."
            value={draftStatus}
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
