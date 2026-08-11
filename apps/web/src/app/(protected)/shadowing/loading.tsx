import { PracticeCatalogSkeleton } from "@/components/common/practice-catalog/practice-catalog-skeleton";

export default function ShadowingLoading() {
  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1300px]">
        <h1 className="sr-only">Shadowing lessons</h1>
        <PracticeCatalogSkeleton featureLabel="Shadowing" />
      </div>
    </main>
  );
}
