import { LoaderCircle } from "lucide-react";

export default function ShadowingAttemptResultLoading() {
  return (
    <main className="px-4 py-6 sm:px-8 sm:py-8 lg:py-10">
      <div
        className="flex min-h-[calc(100dvh-70px-3rem)] items-center justify-center sm:min-h-[calc(100dvh-70px-4rem)] lg:min-h-[calc(100dvh-70px-5rem)]"
        role="status"
      >
        <LoaderCircle aria-hidden="true" className="size-8 animate-spin" />
        <span className="sr-only">Loading Shadowing result...</span>
      </div>
    </main>
  );
}
