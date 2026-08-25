"use client";

import type { ReactNode } from "react";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ProtectedRouteContentSkeleton } from "@/components/common/protected-route/protected-route-content-skeleton";
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
      <div className="landing-grid min-h-dvh bg-background text-foreground">
        <ProtectedRouteContentSkeleton
          statusMessage={
            isRestoringSession
              ? "Checking your session…"
              : "Your session is ready. Redirecting to your dashboard…"
          }
        />
      </div>
    );
  }

  return children;
}
