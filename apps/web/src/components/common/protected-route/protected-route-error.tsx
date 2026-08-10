"use client";

import { Button } from "@/components/ui/button";

import { ProtectedRouteStatusPanel } from "./protected-route-status-panel";

type ProtectedRouteErrorProps = {
  description: string;
  reset: () => void;
};

export function ProtectedRouteError({ description, reset }: ProtectedRouteErrorProps) {
  return (
    <main className="px-5 py-14 sm:px-8 lg:py-20">
      <ProtectedRouteStatusPanel
        action={<Button onClick={reset}>Try again</Button>}
        description={description}
        title="Something went wrong"
        variant="error"
      />
    </main>
  );
}
