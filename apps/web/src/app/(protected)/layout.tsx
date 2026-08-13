import type { ReactNode } from "react";

import { ProtectedRouteGuard } from "@/components/common/auth/protected-route-guard";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <ProtectedRouteGuard>{children}</ProtectedRouteGuard>;
}
