import { ListeningTranslationSkeleton } from "./_components/listening-translation-skeleton";

export default function ListeningTranslationLoading() {
  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1300px]">
        <ListeningTranslationSkeleton />
      </div>
    </main>
  );
}
