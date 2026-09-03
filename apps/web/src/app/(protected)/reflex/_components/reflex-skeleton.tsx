import { Skeleton } from "@/components/ui/skeleton";

export function ReflexSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading reflex catalog" className="space-y-6">
      <span className="sr-only">Loading reflex catalog…</span>

      {/* Guide skeleton (full-width) */}
      <Skeleton className="h-14 rounded-base border-2 border-border shadow-shadow" />

      {/* Due reviews skeleton (full-width) */}
      <Skeleton className="h-14 rounded-base border-2 border-border shadow-shadow" />

      {/* All lessons section skeleton (full-row) */}
      <div className="space-y-6">
        {/* Header & Filter bar skeleton */}
        <Skeleton className="h-32 rounded-base border-2 border-border shadow-shadow" />

        {/* 3-col Lesson cards grid skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              className="flex h-64 flex-col justify-between rounded-base border-2 border-border bg-secondary-background p-5 shadow-shadow"
              key={index}
            >
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-12 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
