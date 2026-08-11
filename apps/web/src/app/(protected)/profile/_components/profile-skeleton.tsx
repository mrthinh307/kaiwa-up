import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading profile" className="grid gap-6 lg:grid-cols-12">
      <span className="sr-only">Loading profile…</span>
      <Skeleton className="h-[390px] border-4 bg-main/45 shadow-shadow lg:col-span-4" />
      <div className="space-y-6 lg:col-span-8">
        <Skeleton className="h-[270px] shadow-shadow" />
        <Skeleton className="h-[310px] shadow-shadow" />
      </div>
    </div>
  );
}
