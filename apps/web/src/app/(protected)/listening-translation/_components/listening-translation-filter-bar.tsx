"use client";

import { Check, FilterX, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type TranslationDifficultyFilter = "all" | "N1" | "N2" | "N3" | "N4" | "N5";
export type TranslationStatusFilter = "all" | "completed" | "uncompleted";

type ListeningTranslationFilterBarProps = {
  hasActiveFilters: boolean;
  onDifficultyChange: (difficulty: TranslationDifficultyFilter) => void;
  onResetFilters: () => void;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: TranslationStatusFilter) => void;
  searchQuery: string;
  selectedDifficulty: TranslationDifficultyFilter;
  selectedStatus: TranslationStatusFilter;
  totalMatching: number;
  totalUnfiltered: number;
};

const DIFFICULTY_OPTIONS: readonly { label: string; value: TranslationDifficultyFilter }[] = [
  { label: "All levels", value: "all" },
  { label: "N5", value: "N5" },
  { label: "N4", value: "N4" },
  { label: "N3", value: "N3" },
  { label: "N2", value: "N2" },
  { label: "N1", value: "N1" },
];

const STATUS_OPTIONS: readonly { label: string; value: TranslationStatusFilter }[] = [
  { label: "All status", value: "all" },
  { label: "Need practice", value: "uncompleted" },
  { label: "Completed", value: "completed" },
];

export function ListeningTranslationFilterBar({
  hasActiveFilters,
  onDifficultyChange,
  onResetFilters,
  onSearchChange,
  onStatusChange,
  searchQuery,
  selectedDifficulty,
  selectedStatus,
  totalMatching,
  totalUnfiltered,
}: ListeningTranslationFilterBarProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* JLPT Level Tabs */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist">
          {DIFFICULTY_OPTIONS.map((option) => {
            const isSelected = selectedDifficulty === option.value;
            return (
              <Button
                aria-selected={isSelected}
                className="h-8 px-3 text-xs"
                key={option.value}
                onClick={() => onDifficultyChange(option.value)}
                role="tab"
                size="sm"
                type="button"
                variant={isSelected ? "default" : "neutral"}
              >
                {option.label}
              </Button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/50"
          />
          <Input
            aria-label="Search listening lessons"
            className="h-9 pl-9 pr-3 text-sm"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search title or topic..."
            type="search"
            value={searchQuery}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-border pt-3">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-heading uppercase text-foreground/60">Status:</span>
          {STATUS_OPTIONS.map((option) => {
            const isSelected = selectedStatus === option.value;
            return (
              <Button
                className="h-7 gap-1 px-2.5 text-xs"
                key={option.value}
                onClick={() => onStatusChange(option.value)}
                size="sm"
                type="button"
                variant={isSelected ? "default" : "neutral"}
              >
                {isSelected ? <Check aria-hidden="true" className="size-3" /> : null}
                {option.label}
              </Button>
            );
          })}
        </div>

        {/* Result Counter & Reset */}
        <div className="flex items-center gap-3 text-xs text-foreground/70">
          <span>
            Showing <strong className="text-foreground">{totalMatching}</strong> of{" "}
            {totalUnfiltered} lessons
          </span>
          {hasActiveFilters ? (
            <Button
              className="h-7 gap-1 px-2 text-xs"
              onClick={onResetFilters}
              size="sm"
              type="button"
              variant="neutral"
            >
              <FilterX aria-hidden="true" className="size-3.5" />
              Reset
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
