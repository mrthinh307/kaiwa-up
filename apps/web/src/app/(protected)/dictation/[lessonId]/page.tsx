import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { getMockDictationContent } from "../_utils/dictation-practice-mock";
import { DictationPracticeScreen } from "./_components/dictation-practice-screen";

type DictationLessonPageProps = {
  params: Promise<{ lessonId: string }>;
};

export async function generateMetadata({ params }: DictationLessonPageProps): Promise<Metadata> {
  const { lessonId } = await params;
  const content = getMockDictationContent(lessonId);

  if (!content) {
    return { title: "Dictation lesson not found | KaiwaUp" };
  }

  return {
    description: `Practice Japanese Dictation with ${content.title}, one timestamped segment at a time.`,
    title: `${content.title} | Dictation | KaiwaUp`,
  };
}

export default async function DictationLessonPage({ params }: DictationLessonPageProps) {
  const { lessonId } = await params;
  const content = getMockDictationContent(lessonId);

  if (!content) {
    notFound();
  }

  return (
    <main className="px-4 py-6 sm:px-8 sm:py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1300px]">
        <DictationPracticeScreen content={content} />
      </div>
    </main>
  );
}
