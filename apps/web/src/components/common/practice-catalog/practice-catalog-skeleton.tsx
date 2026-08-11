import { Skeleton } from "@/components/ui/skeleton";

type PracticeCatalogSkeletonProps = {
  featureLabel: string;
};

export function PracticeCatalogSkeleton({ featureLabel }: PracticeCatalogSkeletonProps) {
  return (
    <div aria-busy="true" aria-label={`Loading ${featureLabel} lessons`} role="status">
      <span className="sr-only">Loading {featureLabel} lessons…</span>

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
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-base border-2 border-border bg-secondary-background p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 shrink-0 bg-main/50" />
          <div>
            <Skeleton className="h-6 w-52" />
            <Skeleton className="mt-2 h-4 w-60 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-full sm:w-32" />
      </div>

      <div className="mt-4 grid border-l-2 border-t-2 border-border md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <div
            className="min-h-[360px] border-b-2 border-r-2 border-border bg-secondary-background p-5 sm:p-7"
            key={index}
          >
            <div className="flex justify-between gap-4">
              <Skeleton className="h-7 w-12 bg-main/50" />
              <Skeleton className="h-8 w-28" />
            </div>
            <Skeleton className="mt-8 h-5 w-32" />
            <Skeleton className="mt-4 h-9 w-full" />
            <Skeleton className="mt-3 h-9 w-2/3" />
            <Skeleton className="mt-4 h-12 w-full" />
            <Skeleton className="mt-5 h-5 w-24" />
            <Skeleton className="mt-8 h-10 w-36 bg-main/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
