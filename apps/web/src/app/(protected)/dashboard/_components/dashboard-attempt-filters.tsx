import { PracticeCatalogSearch } from "@/components/common/practice-catalog/practice-catalog-search";

import type {
  DashboardAttemptStatus,
  DashboardPracticeMode,
} from "../_utils/dashboard-mock-adapter";

import { DashboardAttemptFilterSheet } from "./dashboard-attempt-filter-sheet";

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
    <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
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
      <DashboardAttemptFilterSheet
        searchQuery={searchQuery}
        selectedPracticeMode={selectedPracticeMode}
        selectedStatus={selectedStatus}
      />
    </div>
  );
}
