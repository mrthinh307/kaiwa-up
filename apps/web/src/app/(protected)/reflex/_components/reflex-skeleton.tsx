import { Skeleton } from "@/components/ui/skeleton";

export function ReflexSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading reflex catalog"
      className="grid gap-8 lg:grid-cols-12"
    >
      <span className="sr-only">Loading reflex catalog…</span>

      {/* Primary Column Skeleton (lg:col-span-8) */}
      <div className="space-y-6 lg:col-span-8">
        {/* Header & Filter bar skeleton */}
        <Skeleton className="h-32 rounded-base border-2 border-border shadow-shadow" />

        {/* 2-col Lesson cards grid skeleton */}
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
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

      {/* Secondary Sidebar Skeleton (lg:col-span-4) */}
      <div className="space-y-6 lg:col-span-4">
        {/* Due review skeleton */}
        <Skeleton className="h-36 rounded-base border-2 border-border shadow-shadow" />

        {/* Stats widget skeleton */}
        <Skeleton className="h-44 rounded-base border-2 border-border shadow-shadow" />

        {/* Guide widget skeleton */}
        <Skeleton className="h-20 rounded-base border-2 border-border shadow-shadow" />
      </div>
    </div>
  );
}
