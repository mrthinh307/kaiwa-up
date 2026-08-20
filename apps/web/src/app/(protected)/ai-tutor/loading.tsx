import { Skeleton } from "@/components/ui/skeleton";

export default function AiTutorLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading AI Tutor workspace"
      className="h-[calc(100dvh-70px)] min-h-[560px] overflow-hidden bg-background"
    >
      <div className="grid h-full min-h-0 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 space-y-4 border-r-4 border-border bg-secondary-background p-4 lg:block">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </aside>
        <section className="flex min-h-0 flex-col">
          <div className="flex h-16 shrink-0 items-center gap-3 border-b-4 border-border bg-secondary-background px-5 sm:px-6">
            <Skeleton className="size-10 lg:hidden" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-64 max-w-[60vw]" />
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-5 sm:p-8">
            <Skeleton className="h-72 w-full max-w-[720px] border-4" />
          </div>
        </section>
      </div>
      <span className="sr-only" role="status">
        Loading AI Tutor workspace…
      </span>
    </main>
  );
}
