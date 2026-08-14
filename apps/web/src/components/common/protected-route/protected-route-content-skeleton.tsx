import { Skeleton } from "@/components/ui/skeleton";

type ProtectedRouteContentSkeletonProps = {
  shouldAnnounce?: boolean;
  statusMessage?: string;
};

export function ProtectedRouteContentSkeleton({
  shouldAnnounce = true,
  statusMessage = "Loading page content…",
}: ProtectedRouteContentSkeletonProps) {
  return (
    <main aria-busy={shouldAnnounce || undefined} className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1300px]">
        {shouldAnnounce ? (
          <span className="sr-only" role="status">
            {statusMessage}
          </span>
        ) : null}

        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-5 h-12 w-full max-w-[760px]" />
        <Skeleton className="mt-4 h-6 w-full max-w-[640px]" />

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-56 w-full border-4" />
          <Skeleton className="h-56 w-full border-4" />
          <Skeleton className="h-56 w-full border-4 md:col-span-2 xl:col-span-1" />
        </div>
      </div>
    </main>
  );
}
