"use client";

import { ProtectedRouteError } from "@/components/common/protected-route/protected-route-error";

export default function DictationLessonError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ProtectedRouteError
      description="An unexpected problem interrupted this lesson. Try loading the Dictation exercise again."
      reset={reset}
    />
  );
}
