import Link from "next/link";

import { ProtectedRouteStatusPanel } from "@/components/common/protected-route/protected-route-status-panel";
import { Button } from "@/components/ui/button";

export default function ListeningTranslationLessonNotFound() {
  return (
    <main className="px-5 py-14 sm:px-8 lg:py-20">
      <ProtectedRouteStatusPanel
        action={
          <Button asChild>
            <Link href="/listening-translation">Back to translation lessons</Link>
          </Button>
        }
        description="This Listening Translation lesson does not exist or is no longer available."
        title="Lesson not found"
        variant="error"
      />
    </main>
  );
}
