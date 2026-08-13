"use client";

import { ProtectedRouteError } from "@/components/common/protected-route/protected-route-error";

export default function LessonsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ProtectedRouteError
      description="An unexpected problem interrupted the lesson library. Try loading the catalog again."
      reset={reset}
    />
  );
}
