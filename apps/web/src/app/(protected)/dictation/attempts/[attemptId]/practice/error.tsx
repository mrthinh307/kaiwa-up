"use client";

import { ProtectedRouteError } from "@/components/common/protected-route/protected-route-error";

export default function DictationAttemptPracticeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ProtectedRouteError
      description="An unexpected problem interrupted this Dictation attempt. Try loading it again."
      reset={reset}
    />
  );
}
