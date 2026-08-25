"use client";

import type { ReactNode } from "react";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { ProtectedRouteBackground } from "@/components/common/protected-route/protected-route-background";
import { ProtectedRouteContentSkeleton } from "@/components/common/protected-route/protected-route-content-skeleton";
import { ProtectedRouteStatusPanel } from "@/components/common/protected-route/protected-route-status-panel";
import { ProtectedSessionShell } from "@/components/common/protected-route/protected-session-shell";
import { ProtectedHeader } from "@/components/layouts/protected-header";
import { Button } from "@/components/ui/button";
import { getUserDisplayName } from "@/contexts/auth-context";
import { useAuth } from "@/hooks/use-auth";

export function ProtectedRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { retrySession, status, user } = useAuth();

  useEffect(() => {
    if (status !== "guest") {
      return;
    }

    const currentPath = `${pathname}${window.location.search}${window.location.hash}`;
    router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
  }, [pathname, router, status]);

  if (status === "initializing") {
    return (
      <ProtectedSessionShell isBusy statusMessage="Restoring your session…">
        <ProtectedRouteContentSkeleton shouldAnnounce={false} />
      </ProtectedSessionShell>
    );
  }

  if (status === "unavailable") {
    return (
      <ProtectedSessionShell statusMessage="Session unavailable">
        <main className="flex min-h-[calc(100dvh-70px)] items-center px-5 py-14 sm:px-8">
          <div className="mx-auto w-full max-w-[1300px]">
            <ProtectedRouteStatusPanel
              action={<Button onClick={() => void retrySession()}>Try again</Button>}
              description="We could not restore your session because the service is unavailable. Check your connection and try again."
              title="Session unavailable"
              variant="error"
            />
          </div>
        </main>
      </ProtectedSessionShell>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <ProtectedSessionShell isBusy statusMessage="Redirecting to login…">
        <ProtectedRouteContentSkeleton shouldAnnounce={false} />
      </ProtectedSessionShell>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProtectedHeader
        user={{
          avatarUrl: user.avatar_url,
          displayName: getUserDisplayName(user),
          email: user.email,
        }}
      />
      <ProtectedRouteBackground>{children}</ProtectedRouteBackground>
    </div>
  );
}
