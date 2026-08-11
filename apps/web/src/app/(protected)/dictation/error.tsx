"use client";

import { ProtectedRouteError } from "@/components/common/protected-route/protected-route-error";

export default function DictationError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ProtectedRouteError
      description="An unexpected problem interrupted this page. Try loading the Dictation catalog again."
      reset={retry}
    />
  );
}
