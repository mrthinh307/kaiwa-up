"use client";

import { ProtectedRouteError } from "@/components/common/protected-route/protected-route-error";

export default function ShadowingAttemptPracticeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ProtectedRouteError
      description="An unexpected problem interrupted this Shadowing attempt. Try loading it again."
      reset={reset}
    />
  );
}
