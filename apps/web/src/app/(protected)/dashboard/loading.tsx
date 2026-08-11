import { DashboardSkeleton } from "./_components/dashboard-skeleton";

export default function DashboardLoading() {
  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1300px]">
        <h1 className="sr-only">Dashboard</h1>
        <DashboardSkeleton />
      </div>
    </main>
  );
}
