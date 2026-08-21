"use client";

import { ProtectedRouteError } from "@/components/common/protected-route/protected-route-error";

export default function ListeningTranslationLessonError({ reset }: { reset: () => void }) {
  return (
    <ProtectedRouteError
      description="We could not load this translation exercise. Try loading it again."
      reset={reset}
    />
  );
}
