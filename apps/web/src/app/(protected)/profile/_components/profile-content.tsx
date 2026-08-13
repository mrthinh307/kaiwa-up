"use client";

import type { GamificationProfileResponse } from "@kaiwa-app/api-client";

import { useCallback, useEffect, useState } from "react";

import { ProtectedRouteStatusPanel } from "@/components/common/protected-route/protected-route-status-panel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getGamificationProfile } from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

import { ProfileScreen } from "./profile-screen";
import { ProfileSkeleton } from "./profile-skeleton";

export function ProfileContent() {
  const { protectedRequest, user } = useAuth();
  const [progress, setProgress] = useState<GamificationProfileResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyProgressResult = useCallback(
    (result: Awaited<ReturnType<typeof getGamificationProfile>>) => {
      if (result.data) {
        setProgress(result.data);
      } else {
        setErrorMessage(parseApiFailure(result).message);
      }

      setIsLoading(false);
    },
    [],
  );

  const loadProgress = useCallback(async () => {
    setErrorMessage(null);
    setIsLoading(true);
    const result = await protectedRequest(() => getGamificationProfile());
    applyProgressResult(result);
  }, [applyProgressResult, protectedRequest]);

  useEffect(() => {
    let isActive = true;

    void protectedRequest(() => getGamificationProfile()).then((result) => {
      if (isActive) {
        applyProgressResult(result);
      }
    });

    return () => {
      isActive = false;
    };
  }, [applyProgressResult, protectedRequest]);

  if (isLoading || !user) {
    return <ProfileSkeleton />;
  }

  if (errorMessage || !progress) {
    return (
      <ProtectedRouteStatusPanel
        action={<Button onClick={() => void loadProgress()}>Try again</Button>}
        description={errorMessage ?? "Your learning progress is temporarily unavailable."}
        title="Profile unavailable"
        variant="error"
      />
    );
  }

  return <ProfileScreen progress={progress} user={user} />;
}
