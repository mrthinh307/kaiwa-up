import { Skeleton } from "@/components/ui/skeleton";

export function ReflexSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading reflex catalog" className="space-y-10">
      <span className="sr-only">Loading reflex catalog…</span>

      {/* Stats bar skeleton */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-base border-2 border-border shadow-shadow" />
        <Skeleton className="h-24 rounded-base border-2 border-border shadow-shadow" />
        <Skeleton className="h-24 rounded-base border-2 border-border shadow-shadow" />
      </div>

      {/* Guide skeleton */}
      <Skeleton className="h-14 rounded-base border-2 border-border shadow-shadow" />

      {/* Due reviews skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-24 rounded-base border-2 border-border shadow-shadow" />
      </div>

      {/* All lessons skeleton */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-6 w-24" />
        </div>

        {/* Filter bar skeleton */}
        <Skeleton className="h-20 rounded-base border-2 border-border" />

        {/* Cards grid skeleton */}
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
