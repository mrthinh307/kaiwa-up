import type { ReactNode } from "react";

import { GuestRouteGuard } from "@/components/common/auth/guest-route-guard";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <GuestRouteGuard>
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    </GuestRouteGuard>
  );
}
