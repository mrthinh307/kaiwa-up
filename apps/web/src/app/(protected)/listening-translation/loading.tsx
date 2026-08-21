import { ProtectedRouteContentSkeleton } from "@/components/common/protected-route/protected-route-content-skeleton";

export default function ListeningTranslationLoading() {
  return <ProtectedRouteContentSkeleton statusMessage="Loading Listening Translation lessons…" />;
}
