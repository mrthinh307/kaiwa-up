"use client";

import { ProtectedRouteError } from "@/components/common/protected-route/protected-route-error";

export default function ShadowingError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ProtectedRouteError
      description="An unexpected problem interrupted this page. Try loading the Shadowing catalog again."
      reset={retry}
    />
  );
}
