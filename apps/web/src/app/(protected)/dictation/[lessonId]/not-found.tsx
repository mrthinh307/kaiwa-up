import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ProtectedRouteStatusPanel } from "@/components/common/protected-route/protected-route-status-panel";
import { Button } from "@/components/ui/button";

export default function DictationLessonNotFound() {
  return (
    <main className="px-5 py-14 sm:px-8 lg:py-20">
      <ProtectedRouteStatusPanel
        action={
          <Button asChild>
            <Link href="/lessons">
              <ArrowLeft aria-hidden="true" />
              Back to lessons
            </Link>
          </Button>
        }
        description="This lesson may have moved or may not support Dictation. Choose another option from the lesson library."
        title="Dictation lesson not found"
        variant="error"
      />
    </main>
  );
}
