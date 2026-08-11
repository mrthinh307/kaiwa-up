import type { Metadata } from "next";

import { BookOpenCheck } from "lucide-react";

import { PracticeCatalog } from "@/components/common/practice-catalog/practice-catalog";
import { ProtectedPageHeader } from "@/components/common/protected-route/protected-page-header";
import { getPracticeCatalog } from "@/lib/practice-catalog-mock";
import {
  parseCatalogPage,
  parseCatalogSearchQuery,
  parseJlptDifficulty,
} from "@/lib/practice-catalog-query";

import { DictationMethodGuide } from "./_components/dictation-method-guide";
import { getDictationLessonHref } from "./_utils/dictation-formatters";

export const metadata: Metadata = {
  description:
    "Choose a Dictation lesson and sharpen your Japanese listening by completing the words and sentences you hear.",
  title: "Dictation lessons | KaiwaUp",
};

type DictationPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DictationPage({ searchParams }: DictationPageProps) {
  const resolvedSearchParams = await searchParams;
  const difficultyParam = resolvedSearchParams.difficulty;
  const pageParam = resolvedSearchParams.page;
  const searchQueryParam = resolvedSearchParams.q;
  const selectedDifficulty = parseJlptDifficulty(
    Array.isArray(difficultyParam) ? difficultyParam.at(0) : difficultyParam,
  );
  const page = parseCatalogPage(Array.isArray(pageParam) ? pageParam.at(0) : pageParam);
  const searchQuery = parseCatalogSearchQuery(
    Array.isArray(searchQueryParam) ? searchQueryParam.at(0) : searchQueryParam,
  );
  const catalog = getPracticeCatalog({
    contentType: "dictation",
    difficulty: selectedDifficulty,
    page,
    searchQuery,
  });

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1300px]">
        <ProtectedPageHeader
          description="Rebuild what you hear, catch the details your ears usually miss, and learn from every correction."
          eyebrow="Dictation"
          icon={BookOpenCheck}
          title="Hear it. Catch it. Write it."
        />

        <div className="mt-10">
          <PracticeCatalog
            basePath="/dictation"
            catalog={catalog}
            emptyIcon={BookOpenCheck}
            featureLabel="Dictation"
            getLessonHref={getDictationLessonHref}
            idPrefix="dictation"
            methodGuide={<DictationMethodGuide />}
            searchQuery={searchQuery}
            selectedDifficulty={selectedDifficulty}
          />
        </div>
      </div>
    </main>
  );
}
