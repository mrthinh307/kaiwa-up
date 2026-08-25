"use client";

import { ProtectedRouteStatusPanel } from "@/components/common/protected-route/protected-route-status-panel";
import { Button } from "@/components/ui/button";

export default function AiTutorError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex h-[calc(100dvh-70px)] min-h-[560px] items-center px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-[680px]">
        <ProtectedRouteStatusPanel
          action={<Button onClick={reset}>Try again</Button>}
          description="The AI Tutor workspace could not be prepared. Try loading it again."
          title="AI Tutor unavailable"
          variant="error"
        />
      </div>
    </main>
  );
}
