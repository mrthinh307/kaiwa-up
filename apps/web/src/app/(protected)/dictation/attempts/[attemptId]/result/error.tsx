"use client";

import { ProtectedRouteError } from "@/components/common/protected-route/protected-route-error";

export default function DictationAttemptResultError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ProtectedRouteError
      description="An unexpected problem interrupted this Dictation result. Try loading it again."
      reset={reset}
    />
  );
}
