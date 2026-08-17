import { Skeleton } from "@/components/ui/skeleton";

export default function DictationLessonLoading() {
  return (
    <main className="px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
      <div className="mx-auto w-full max-w-[1300px]" role="status">
        <span className="sr-only">Loading Dictation lesson...</span>
        <Skeleton className="h-9 w-40" />
        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
          <div>
            <Skeleton className="h-8 w-36" />
            <Skeleton className="mt-5 h-12 w-full max-w-[720px]" />
            <Skeleton className="mt-4 h-6 w-full max-w-[620px]" />
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="mt-8 h-56 w-full border-4" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Skeleton className="h-[520px] w-full border-4" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    </main>
  );
}
