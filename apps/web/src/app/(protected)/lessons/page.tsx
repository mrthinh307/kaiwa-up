import type { Metadata } from "next";

import { LibraryBig } from "lucide-react";

import { PracticeCatalog } from "@/components/common/practice-catalog/practice-catalog";
import { ProtectedPageHeader } from "@/components/common/protected-route/protected-page-header";
import { getPracticeCatalog, getPracticeTopics } from "@/lib/practice-catalog-mock";
import {
  parseCatalogPage,
  parseCatalogSearchQuery,
  parseJlptDifficulty,
  parsePracticeLearningStatus,
} from "@/lib/practice-catalog-query";

export const metadata: Metadata = {
  description:
    "Browse Japanese listening lessons and practice every lesson with Shadowing or Dictation.",
  title: "Lessons | KaiwaUp",
};

type LessonsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value.at(0) : value;
}

export default async function LessonsPage({ searchParams }: LessonsPageProps) {
  const resolvedSearchParams = await searchParams;
  const topics = getPracticeTopics();
  const difficulty = parseJlptDifficulty(firstQueryValue(resolvedSearchParams.difficulty));
  const page = parseCatalogPage(firstQueryValue(resolvedSearchParams.page));
  const searchQuery = parseCatalogSearchQuery(firstQueryValue(resolvedSearchParams.q));
  const topicParam = parseCatalogSearchQuery(firstQueryValue(resolvedSearchParams.topic));
  const selectedLearningStatus = parsePracticeLearningStatus(
    firstQueryValue(resolvedSearchParams.learning_status),
  );
  const selectedTopic = topics.find(
    (topic) => topic.toLocaleLowerCase("en") === topicParam?.toLocaleLowerCase("en"),
  );
  const catalog = getPracticeCatalog({
    difficulty,
    learningStatus: selectedLearningStatus,
    page,
    searchQuery,
    topic: selectedTopic,
  });

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1300px]">
        <ProtectedPageHeader
          description="Explore Japanese listening content and practice every lesson with Shadowing or Dictation."
          eyebrow="Lesson Library"
          icon={LibraryBig}
          title="Choose a lesson. Practice it your way."
        />

        <div className="mt-10">
          <PracticeCatalog
            catalog={catalog}
            searchQuery={searchQuery}
            selectedDifficulty={difficulty}
            selectedLearningStatus={selectedLearningStatus}
            selectedTopic={selectedTopic}
            topics={topics}
          />
        </div>
      </div>
    </main>
  );
}
