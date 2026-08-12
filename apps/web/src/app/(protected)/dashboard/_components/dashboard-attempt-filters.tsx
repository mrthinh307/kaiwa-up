import type { PracticeCatalogOption } from "@/types/practice-catalog";

import { PracticeCatalogComboboxFilter } from "@/components/common/practice-catalog/practice-catalog-combobox-filter";
import { PracticeCatalogSearch } from "@/components/common/practice-catalog/practice-catalog-search";

import type {
  DashboardAttemptStatus,
  DashboardPracticeMode,
} from "../_utils/dashboard-mock-adapter";

const PRACTICE_MODE_OPTIONS = [
  { label: "Shadowing", value: "shadowing" },
  { label: "Dictation", value: "dictation" },
] satisfies PracticeCatalogOption[];

const ATTEMPT_STATUS_OPTIONS = [
  { label: "Completed", value: "completed" },
  { label: "In progress", value: "in_progress" },
] satisfies PracticeCatalogOption[];

export function DashboardAttemptFilters({
  searchQuery,
  selectedPracticeMode,
  selectedStatus,
}: {
  searchQuery?: string;
  selectedPracticeMode?: DashboardPracticeMode;
  selectedStatus?: DashboardAttemptStatus;
}) {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] lg:items-end">
      <PracticeCatalogSearch
        basePath="/dashboard"
        id="dashboard-attempt-search"
        initialQuery={searchQuery}
        key={searchQuery}
        label="Search attempts"
        placeholder="Search by lesson title..."
        preservedParams={{
          practice_mode: selectedPracticeMode,
          status: selectedStatus,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <PracticeCatalogComboboxFilter
          allLabel="All modes"
          basePath="/dashboard"
          emptyMessage="No practice mode found."
          id="dashboard-practice-mode"
          label="Practice mode"
          options={PRACTICE_MODE_OPTIONS}
          preservedParams={{ q: searchQuery, status: selectedStatus }}
          queryKey="practice_mode"
          searchLabel="Search practice modes"
          searchPlaceholder="Search modes..."
          value={selectedPracticeMode}
        />
        <PracticeCatalogComboboxFilter
          allLabel="All statuses"
          basePath="/dashboard"
          emptyMessage="No attempt status found."
          id="dashboard-attempt-status"
          label="Status"
          options={ATTEMPT_STATUS_OPTIONS}
          preservedParams={{ practice_mode: selectedPracticeMode, q: searchQuery }}
          queryKey="status"
          searchLabel="Search attempt statuses"
          searchPlaceholder="Search statuses..."
          value={selectedStatus}
        />
      </div>
    </div>
  );
}
