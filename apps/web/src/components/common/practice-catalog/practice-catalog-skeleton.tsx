import { Skeleton } from "@/components/ui/skeleton";

export function PracticeCatalogSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading lessons" role="status">
      <span className="sr-only">Loading lessons…</span>

      <div className="max-w-[760px]">
        <Skeleton className="h-8 w-36 bg-main/50" />
        <Skeleton className="mt-5 h-12 w-full sm:w-[620px]" />
        <Skeleton className="mt-4 h-6 w-full sm:w-[700px]" />
      </div>

      <div className="mt-10 grid gap-5 rounded-base border-4 border-border bg-background p-5 shadow-shadow sm:p-7 lg:grid-cols-[minmax(220px,1fr)_minmax(0,700px)] lg:items-end">
        <div>
          <Skeleton className="h-9 w-56" />
          <Skeleton className="mt-3 h-5 w-44" />
        </div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full md:w-28" />
        </div>
      </div>

      <div className="mt-4 grid border-l-2 border-t-2 border-border md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <div
            className="min-h-[440px] border-b-2 border-r-2 border-border bg-secondary-background p-5 sm:p-7"
            key={index}
          >
            <div className="flex justify-between gap-4">
              <Skeleton className="h-7 w-12 bg-main/50" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="mt-8 h-5 w-32" />
            <Skeleton className="mt-4 h-9 w-full" />
            <Skeleton className="mt-3 h-9 w-2/3" />
            <Skeleton className="mt-4 h-12 w-full" />
            <Skeleton className="mt-16 h-4 w-28" />
            <Skeleton className="mt-3 h-16 w-full" />
            <Skeleton className="mt-2 h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
