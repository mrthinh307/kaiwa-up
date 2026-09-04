import { Skeleton } from "@/components/ui/skeleton";

export default function DictationAttemptResultLoading() {
  return (
    <main className="px-4 py-6 sm:px-8 sm:py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1300px]" role="status">
        <span className="sr-only">Loading Dictation result...</span>
        <Skeleton className="h-16 w-full border-2" />
        <Skeleton className="mt-6 h-56 w-full border-2" />
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-[620px] w-full border-2 lg:col-span-8" />
          <Skeleton className="h-96 w-full border-2 lg:col-span-4" />
        </div>
      </div>
    </main>
  );
}
