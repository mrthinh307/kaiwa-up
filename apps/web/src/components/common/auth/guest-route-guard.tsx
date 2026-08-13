"use client";

import type { ReactNode } from "react";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppLoadingScreen } from "@/components/common/app-route/app-loading-screen";
import { useAuth } from "@/hooks/use-auth";

export function GuestRouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [router, status]);

  if (status === "initializing" || status === "authenticated") {
    const isRestoringSession = status === "initializing";

    return (
      <AppLoadingScreen
        description={
          isRestoringSession
            ? "We’re checking your session so you can continue where you left off."
            : "Your session is ready. We’re taking you to your learning dashboard."
        }
        title={isRestoringSession ? "Welcome back — one moment" : "Opening your dashboard"}
      />
    );
  }

  return children;
}
