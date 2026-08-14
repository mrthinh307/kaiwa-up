"use client";

import { useCallback, useEffect, useState } from "react";

import { ProtectedRouteStatusPanel } from "@/components/common/protected-route/protected-route-status-panel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getGamificationProfile, getProgressSummary, listProgressAttempts } from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

import type {
  DashboardAttemptStatus,
  DashboardPracticeMode,
  DashboardViewModel,
} from "../_utils/dashboard-api-adapter";

import { adaptDashboardData } from "../_utils/dashboard-api-adapter";
import { DashboardScreen } from "./dashboard-screen";
import { DashboardSkeleton } from "./dashboard-skeleton";

const DASHBOARD_PAGE_SIZE = 20;

type DashboardLoadResult = {
  attempts: Awaited<ReturnType<typeof listProgressAttempts>>;
  gamification: Awaited<ReturnType<typeof getGamificationProfile>>;
  summary: Awaited<ReturnType<typeof getProgressSummary>>;
};

type DashboardContentProps = {
  mode?: DashboardPracticeMode;
  page: number;
  searchQuery?: string;
  status?: DashboardAttemptStatus;
};

export function DashboardContent({ mode, page, searchQuery, status }: DashboardContentProps) {
  const { protectedRequest } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardViewModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyDashboardResult = useCallback(
    (result: DashboardLoadResult) => {
      if (result.summary.data && result.attempts.data && result.gamification.data) {
        setDashboard(
          adaptDashboardData({
            attempts: result.attempts.data,
            gamification: result.gamification.data,
            mode,
            searchQuery,
            status,
            summary: result.summary.data,
          }),
        );
      } else {
        const failure = !result.summary.data
          ? result.summary
          : !result.attempts.data
            ? result.attempts
            : result.gamification;
        setErrorMessage(parseApiFailure(failure).message);
      }

      setIsLoading(false);
    },
    [mode, searchQuery, status],
  );

  const fetchDashboard = useCallback(async (): Promise<DashboardLoadResult> => {
    const [summary, attempts, gamification] = await Promise.all([
      protectedRequest(() => getProgressSummary()),
      protectedRequest(() =>
        listProgressAttempts({
          query: {
            content_type: mode,
            page,
            page_size: DASHBOARD_PAGE_SIZE,
            q: searchQuery,
            status,
          },
        }),
      ),
      protectedRequest(() => getGamificationProfile()),
    ]);

    return { attempts, gamification, summary };
  }, [mode, page, protectedRequest, searchQuery, status]);

  const retryDashboard = () => {
    setErrorMessage(null);
    setIsLoading(true);
    void fetchDashboard().then(applyDashboardResult);
  };

  useEffect(() => {
    let isActive = true;

    void fetchDashboard().then((result) => {
      if (isActive) {
        applyDashboardResult(result);
      }
    });

    return () => {
      isActive = false;
    };
  }, [applyDashboardResult, fetchDashboard]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (errorMessage || !dashboard) {
    return (
      <ProtectedRouteStatusPanel
        action={<Button onClick={retryDashboard}>Try again</Button>}
        description={
          errorMessage ?? "Your progress and practice history are temporarily unavailable."
        }
        title="Dashboard unavailable"
        variant="error"
      />
    );
  }

  return <DashboardScreen dashboard={dashboard} />;
}
