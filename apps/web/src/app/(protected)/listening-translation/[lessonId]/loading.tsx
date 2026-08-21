import { ProtectedRouteContentSkeleton } from "@/components/common/protected-route/protected-route-content-skeleton";

export default function ListeningTranslationLessonLoading() {
  return <ProtectedRouteContentSkeleton statusMessage="Loading the translation exercise…" />;
}
