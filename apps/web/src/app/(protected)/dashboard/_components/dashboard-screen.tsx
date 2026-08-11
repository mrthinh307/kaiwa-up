import type { DashboardViewModel } from "../_utils/dashboard-mock-adapter";

import { DashboardAttemptHistory } from "./dashboard-attempt-history";
import { DashboardInProgressLessons } from "./dashboard-in-progress-lessons";
import { DashboardLevelProgress } from "./dashboard-level-progress";
import { DashboardProgressSummary } from "./dashboard-progress-summary";

export function DashboardScreen({ dashboard }: { dashboard: DashboardViewModel }) {
  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)] lg:items-stretch">
        <DashboardLevelProgress gamification={dashboard.gamification} />
        <DashboardProgressSummary progressSummary={dashboard.progressSummary} />
      </div>

      <DashboardInProgressLessons lessons={dashboard.progressSummary.inProgressLessons} />

      <DashboardAttemptHistory
        attemptHistory={dashboard.attemptHistory}
        totalAttempts={dashboard.progressSummary.totalAttempts}
      />
    </div>
  );
}
