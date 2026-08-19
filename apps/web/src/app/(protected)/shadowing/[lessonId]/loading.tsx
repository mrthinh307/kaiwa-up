import { ShadowingSkeleton } from "../_components/shadowing-skeleton";

export default function ShadowingLessonLoading() {
  return (
    <main className="px-4 py-6 sm:px-8 sm:py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1300px]">
        <ShadowingSkeleton />
      </div>
    </main>
  );
}
