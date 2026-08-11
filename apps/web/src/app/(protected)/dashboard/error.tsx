"use client";

import { ProtectedRouteError } from "@/components/common/protected-route/protected-route-error";

export default function DashboardError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ProtectedRouteError
      description="An unexpected problem interrupted this page. Try rendering your dashboard again."
      reset={reset}
    />
  );
}
