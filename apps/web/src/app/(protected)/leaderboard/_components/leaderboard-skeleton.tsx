import { Skeleton } from "@/components/ui/skeleton";

export function LeaderboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading weekly leaderboard" role="status">
      <span className="sr-only">Loading weekly leaderboard…</span>

      <div className="border-b-4 border-border pb-8">
        <div className="max-w-[760px]">
          <Skeleton className="h-8 w-44 bg-main/50" />
          <Skeleton className="mt-5 h-12 w-full sm:w-[620px]" />
          <Skeleton className="mt-4 h-6 w-full sm:w-[700px]" />
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow">
        <div className="border-b-2 border-border p-5 sm:p-7">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mt-3 h-9 w-64 max-w-full" />
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:grid-rows-2">
          <div className="min-h-[380px] border-b-2 border-border bg-rank-gold p-6 lg:row-span-2 lg:min-h-[480px] lg:border-r-2 lg:border-b-0">
            <Skeleton className="size-14" />
            <Skeleton className="mt-28 size-20 rounded-full" />
            <Skeleton className="mt-5 h-10 w-48 max-w-full" />
            <Skeleton className="mt-8 h-12 w-32" />
          </div>
          <div className="min-h-[220px] border-b-2 border-border bg-rank-silver p-6">
            <Skeleton className="size-10" />
            <Skeleton className="mt-16 h-8 w-36" />
          </div>
          <div className="min-h-[220px] bg-rank-bronze p-6">
            <Skeleton className="size-10" />
            <Skeleton className="mt-16 h-8 w-36" />
          </div>
        </div>
      </div>

      <Skeleton className="mt-8 h-[170px] border-4 bg-foreground/75 shadow-shadow" />

      <div className="mt-8 overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow">
        <div className="border-b-2 border-border p-5 sm:p-7">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="mt-3 h-9 w-64 max-w-full" />
        </div>
        {Array.from({ length: 7 }, (_, index) => (
          <div
            className="grid grid-cols-[4rem_minmax(0,1fr)_5rem] items-center gap-3 border-b-2 border-border p-4 sm:grid-cols-[6rem_minmax(0,1fr)_8rem] sm:px-6"
            key={index}
          >
            <Skeleton className="h-6 w-10" />
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <Skeleton className="h-6 w-40 max-w-full" />
            </div>
            <Skeleton className="ml-auto h-6 w-16 max-w-full" />
          </div>
        ))}
        <div className="p-5 sm:p-6">
          <Skeleton className="h-5 w-full sm:w-[520px]" />
        </div>
      </div>
    </div>
  );
}
