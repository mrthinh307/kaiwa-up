import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading profile" className="grid gap-6 lg:grid-cols-12">
      <span className="sr-only">Loading profile…</span>
      <div className="flex flex-col gap-6 lg:col-span-4">
        <Skeleton className="h-[390px] border-4 bg-main/45 shadow-shadow sm:h-[420px]" />
        <Skeleton className="h-[120px] shadow-shadow" />
      </div>
      <div className="space-y-6 lg:col-span-8">
        <Skeleton className="h-[270px] shadow-shadow" />
        <Skeleton className="h-[310px] shadow-shadow" />
      </div>
    </div>
  );
}
