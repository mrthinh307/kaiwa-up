import { ShadowingSkeleton } from "./_components/shadowing-skeleton";

export default function ShadowingLoading() {
  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1000px]">
        <ShadowingSkeleton />
      </div>
    </main>
  );
}
