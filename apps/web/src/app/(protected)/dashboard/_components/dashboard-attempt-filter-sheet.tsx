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

import type { DashboardAttemptStatus } from "../_utils/dashboard-mock-adapter";

import { buildDashboardHref } from "../_utils/dashboard-query";

const ATTEMPT_STATUS_OPTIONS = [
  { label: "Completed", value: "completed" },
  { label: "In progress", value: "in_progress" },
] as const;

type DashboardAttemptFilterSheetProps = {
  searchQuery?: string;
  selectedStatus?: DashboardAttemptStatus;
};

export function DashboardAttemptFilterSheet({
  searchQuery,
  selectedStatus,
}: DashboardAttemptFilterSheetProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draftStatus, setDraftStatus] = useState<DashboardAttemptStatus | undefined>(
    selectedStatus,
  );
  const activeFilterCount = Number(Boolean(selectedStatus));

  const resetDraft = () => {
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
      router.push(
        buildDashboardHref({
          searchQuery,
          status: draftStatus,
        }),
      );
      setIsOpen(false);
    });
  };

  const handleReset = () => {
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
          <SheetDescription>Refine your practice log by completion status.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-7 p-5">
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
