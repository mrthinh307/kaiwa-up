import Link from "next/link";

import { ProtectedRouteStatusPanel } from "@/components/common/protected-route/protected-route-status-panel";
import { Button } from "@/components/ui/button";

export function DashboardPreviewError() {
  return (
    <ProtectedRouteStatusPanel
      action={
        <Button asChild>
          <Link href="/dashboard">Try again</Link>
        </Button>
      }
      description="The dashboard preview could not load your progress and practice attempts."
      title="Dashboard unavailable"
      variant="error"
    />
  );
}
