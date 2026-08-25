import { Skeleton } from "@/components/ui/skeleton";

export function ShadowingSkeleton() {
  return (
    <div className="space-y-6" role="status">
      <span className="sr-only">Loading Shadowing lesson...</span>
      <Skeleton className="h-9 w-40" />

      {/* Header Skeleton */}
      <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
        <div>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="mt-5 h-12 w-full max-w-[720px]" />
          <Skeleton className="mt-4 h-6 w-full max-w-[620px]" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>

      {/* Guide Skeleton */}
      <Skeleton className="mt-8 h-20 w-full rounded-base border-2" />

      {/* 2-Column Preview & Action Grid */}
      <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="rounded-base border-4 border-border bg-secondary-background p-4 lg:col-span-7">
          <Skeleton className="aspect-video w-full" />
        </div>
        <div className="space-y-4 rounded-base border-4 border-border bg-secondary-background p-6 lg:col-span-5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
