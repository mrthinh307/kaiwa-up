import type { ReactNode } from "react";

import { ProtectedRouteBackground } from "@/components/common/protected-route/protected-route-background";
import { ProtectedHeader } from "@/components/layouts/protected-header";

const PROTECTED_HEADER_PREVIEW_USER = {
  avatarUrl: null,
  displayName: "Nguyen Van A",
  email: "user@example.com",
};

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProtectedHeader user={PROTECTED_HEADER_PREVIEW_USER} />

      <ProtectedRouteBackground>{children}</ProtectedRouteBackground>
    </div>
  );
}
