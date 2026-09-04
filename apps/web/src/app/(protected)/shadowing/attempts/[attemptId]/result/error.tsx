"use client";

import { ProtectedRouteError } from "@/components/common/protected-route/protected-route-error";

export default function ShadowingAttemptResultError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ProtectedRouteError
      description="An unexpected problem interrupted this Shadowing result. Try loading it again."
      reset={reset}
    />
  );
}
