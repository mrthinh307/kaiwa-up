import { Skeleton } from "@/components/ui/skeleton";

export function ShadowingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-base border-2 border-border bg-secondary-background p-6 shadow-shadow">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="rounded-base border-2 border-border bg-secondary-background p-6 shadow-shadow space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-16 w-full rounded-base" />
      </div>

      <div className="rounded-base border-2 border-border bg-secondary-background p-6 shadow-shadow space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full rounded-base" />
      </div>

      <div className="rounded-base border-2 border-border bg-secondary-background p-6 shadow-shadow space-y-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-32 w-full rounded-base" />
      </div>
    </div>
  );
}
