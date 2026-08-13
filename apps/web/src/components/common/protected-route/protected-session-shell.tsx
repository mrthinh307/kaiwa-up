import type { ReactNode } from "react";

import { ProtectedRouteBackground } from "@/components/common/protected-route/protected-route-background";
import { Skeleton } from "@/components/ui/skeleton";

type ProtectedSessionShellProps = {
  children: ReactNode;
  isBusy?: boolean;
  statusMessage: string;
};

export function ProtectedSessionShell({
  children,
  isBusy = false,
  statusMessage,
}: ProtectedSessionShellProps) {
  return (
    <div aria-busy={isBusy || undefined} className="min-h-screen bg-background text-foreground">
      <span className="sr-only" role="status">
        {statusMessage}
      </span>

      <header
        aria-hidden="true"
        className="sticky inset-x-0 top-0 z-40 flex h-[70px] items-center border-b-4 border-border bg-secondary-background px-5 sm:px-8"
      >
        <div className="mx-auto flex w-full max-w-[1300px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-8 xl:gap-12">
            <div className="flex shrink-0 items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-base border-2 border-border bg-main text-[22px] font-heading text-main-foreground">
                K
              </span>
              <span className="hidden text-xl font-heading sm:inline">KaiwaUp</span>
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Skeleton className="hidden h-10 w-36 lg:block" />
            <Skeleton className="size-10" />
            <Skeleton className="size-10 lg:hidden" />
          </div>
        </div>
      </header>

      <ProtectedRouteBackground>{children}</ProtectedRouteBackground>
    </div>
  );
}
