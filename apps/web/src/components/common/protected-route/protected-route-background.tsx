import type { ReactNode } from "react";

export function ProtectedRouteBackground({ children }: { children: ReactNode }) {
  return <div className="landing-grid min-h-[calc(100dvh-70px)]">{children}</div>;
}
