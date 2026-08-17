"use client";

import { useCallback, useEffect, useState } from "react";

import { ProtectedRouteStatusPanel } from "@/components/common/protected-route/protected-route-status-panel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getWeeklyLeaderboard } from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

import type { WeeklyLeaderboardViewModel } from "../_utils/leaderboard-types";

import { adaptWeeklyLeaderboard } from "../_utils/leaderboard-api-adapter";
import { LeaderboardScreen } from "./leaderboard-screen";
import { LeaderboardSkeleton } from "./leaderboard-skeleton";

const LEADERBOARD_PAGE_SIZE = 50;

type LeaderboardLoadResult = Awaited<ReturnType<typeof getWeeklyLeaderboard>>;

export function LeaderboardContent() {
  const { protectedRequest } = useAuth();
  const [leaderboard, setLeaderboard] = useState<WeeklyLeaderboardViewModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyLeaderboardResult = useCallback((result: LeaderboardLoadResult) => {
    if (result.data) {
      setLeaderboard(adaptWeeklyLeaderboard(result.data));
    } else {
      setErrorMessage(parseApiFailure(result).message);
    }

    setIsLoading(false);
  }, []);

  const fetchLeaderboard = useCallback(
    () => protectedRequest(() => getWeeklyLeaderboard({ query: { limit: LEADERBOARD_PAGE_SIZE } })),
    [protectedRequest],
  );

  const retryLeaderboard = () => {
    setErrorMessage(null);
    setIsLoading(true);
    void fetchLeaderboard().then(applyLeaderboardResult);
  };

  useEffect(() => {
    let isActive = true;

    void fetchLeaderboard().then((result) => {
      if (isActive) {
        applyLeaderboardResult(result);
      }
    });

    return () => {
      isActive = false;
    };
  }, [applyLeaderboardResult, fetchLeaderboard]);

  if (isLoading) {
    return <LeaderboardSkeleton />;
  }

  if (errorMessage || !leaderboard) {
    return (
      <ProtectedRouteStatusPanel
        action={<Button onClick={retryLeaderboard}>Try again</Button>}
        description={errorMessage ?? "The weekly leaderboard is temporarily unavailable."}
        title="Leaderboard unavailable"
        variant="error"
      />
    );
  }

  return <LeaderboardScreen leaderboard={leaderboard} />;
}
