"use client";

import { Filter, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PracticeCatalogComboboxFilter } from "@/components/common/practice-catalog/practice-catalog-combobox-filter";
import { Button } from "@/components/ui/button";
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
} from "../_utils/dashboard-api-adapter";

import { buildDashboardHref } from "../_utils/dashboard-query";

const ATTEMPT_MODE_OPTIONS = [
  { label: "Shadowing & Dictation", value: "shadowing_dictation" },
  { label: "Reflex", value: "reflex" },
  { label: "Listening & Translation", value: "listening_translation" },
] as const;

const ATTEMPT_STATUS_OPTIONS = [
  { label: "Completed", value: "completed" },
  { label: "In progress", value: "in_progress" },
] as const;

type DashboardAttemptFilterSheetProps = {
  mode?: DashboardPracticeMode;
  searchQuery?: string;
  selectedStatus?: DashboardAttemptStatus;
};

export function DashboardAttemptFilterSheet({
  mode,
  searchQuery,
  selectedStatus,
}: DashboardAttemptFilterSheetProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draftMode, setDraftMode] = useState<DashboardPracticeMode | undefined>(mode);
  const [draftStatus, setDraftStatus] = useState<DashboardAttemptStatus | undefined>(
    selectedStatus,
  );
  const activeFilterCount = Number(Boolean(mode)) + Number(Boolean(selectedStatus));

  const resetDraft = () => {
    setDraftMode(mode);
    setDraftStatus(selectedStatus);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetDraft();
    }

    setIsOpen(nextOpen);
  };

  const handleApply = () => {
    startTransition(() => {
      const href = buildDashboardHref({
        mode: draftMode,
        searchQuery,
        status: draftStatus,
      });

      router.push(`${href}#dashboard-attempts-heading`);
      setIsOpen(false);
    });
  };

  const handleReset = () => {
    setDraftMode(undefined);
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
            Refine your practice log by practice mode and completion status.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-7 p-5">
          <PracticeCatalogComboboxFilter
            allLabel="All practice modes"
            basePath="/dashboard"
            emptyMessage="No practice mode found."
            id="dashboard-attempt-mode-filter"
            label="Practice mode"
            onValueChange={(value) => setDraftMode(value as DashboardPracticeMode | undefined)}
            options={ATTEMPT_MODE_OPTIONS}
            queryKey="mode"
            searchLabel="Search practice modes"
            searchPlaceholder="Search modes..."
            value={draftMode}
          />
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
