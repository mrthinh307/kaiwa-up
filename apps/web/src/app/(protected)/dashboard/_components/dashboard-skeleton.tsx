import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="space-y-10" role="status">
      <span className="sr-only">Loading dashboard…</span>

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)]">
        <Skeleton className="h-[460px] border-4 bg-main/40 shadow-shadow" />
        <Skeleton className="h-[460px] border-4 bg-secondary-background shadow-shadow" />
      </div>

      <Skeleton className="h-[330px] border-4 bg-secondary-background shadow-shadow" />

      <div className="space-y-4">
        <Skeleton className="h-[250px] border-4 bg-background shadow-shadow" />
        <Skeleton className="h-[430px] border-4 bg-secondary-background shadow-shadow" />
        <div className="flex justify-center gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton className="size-10 border-2" key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
