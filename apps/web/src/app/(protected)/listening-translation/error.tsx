"use client";

import { ProtectedRouteError } from "@/components/common/protected-route/protected-route-error";

export default function ListeningTranslationError({ reset }: { reset: () => void }) {
  return (
    <ProtectedRouteError
      description="We could not load the Listening Translation lessons. Try loading the catalog again."
      reset={reset}
    />
  );
}
