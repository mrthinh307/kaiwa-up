"use client";

import type { ReactNode } from "react";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { ProtectedRouteBackground } from "@/components/common/protected-route/protected-route-background";
import { ProtectedRouteStatusPanel } from "@/components/common/protected-route/protected-route-status-panel";
import { ProtectedHeader } from "@/components/layouts/protected-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
      <main
        aria-busy="true"
        aria-label="Restoring your session"
        className="flex min-h-dvh items-center px-5 py-14 sm:px-8"
      >
        <span className="sr-only">Restoring your session…</span>
        <Skeleton className="mx-auto h-52 w-full max-w-[680px] border-4 shadow-shadow" />
      </main>
    );
  }

  if (status === "unavailable") {
    return (
      <main className="flex min-h-dvh items-center px-5 py-14 sm:px-8">
        <ProtectedRouteStatusPanel
          action={<Button onClick={() => void retrySession()}>Try again</Button>}
          description="We could not restore your session because the service is unavailable. Check your connection and try again."
          title="Session unavailable"
          variant="error"
        />
      </main>
    );
  }

  if (status !== "authenticated" || !user) {
    return null;
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
