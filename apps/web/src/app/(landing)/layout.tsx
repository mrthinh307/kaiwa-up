import type { ReactNode } from "react";

import { GuestRouteGuard } from "@/components/common/auth/guest-route-guard";
import { PublicFooter } from "@/components/layouts/public-footer";
import { PublicNavbar } from "@/components/layouts/public-navbar";

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <GuestRouteGuard>
      <div className="min-h-screen overflow-x-hidden text-foreground">
        <PublicNavbar />
        {children}
        <PublicFooter />
      </div>
    </GuestRouteGuard>
  );
}
