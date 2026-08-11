import type { Metadata } from "next";

import { Mic2 } from "lucide-react";

import { PracticeCatalog } from "@/components/common/practice-catalog/practice-catalog";
import { ProtectedPageHeader } from "@/components/common/protected-route/protected-page-header";
import { getPracticeCatalog } from "@/lib/practice-catalog-mock";
import {
  parseCatalogPage,
  parseCatalogSearchQuery,
  parseJlptDifficulty,
} from "@/lib/practice-catalog-query";

import { ShadowingMethodGuide } from "./_components/shadowing-method-guide";
import { getShadowingLessonHref } from "./_utils/shadowing-formatters";

export const metadata: Metadata = {
  description:
    "Choose a Dual Shadowing lesson and practice hearing, repeating, and comparing natural Japanese speech.",
  title: "Shadowing lessons | KaiwaUp",
};

type ShadowingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ShadowingPage({ searchParams }: ShadowingPageProps) {
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
    contentType: "shadowing",
    difficulty: selectedDifficulty,
    page,
    searchQuery,
  });

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1300px]">
        <ProtectedPageHeader
          description="Listen to natural Japanese, follow the speaker aloud, and compare both tracks to build clearer rhythm and pronunciation."
          eyebrow="Dual Shadowing"
          icon={Mic2}
          title="Train your ear and voice together."
        />

        <div className="mt-10">
          <PracticeCatalog
            basePath="/shadowing"
            catalog={catalog}
            emptyIcon={Mic2}
            featureLabel="Shadowing"
            getLessonHref={getShadowingLessonHref}
            idPrefix="shadowing"
            methodGuide={<ShadowingMethodGuide />}
            searchQuery={searchQuery}
            selectedDifficulty={selectedDifficulty}
          />
        </div>
      </div>
    </main>
  );
}
