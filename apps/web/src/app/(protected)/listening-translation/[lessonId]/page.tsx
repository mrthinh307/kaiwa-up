import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { getListeningTranslationLesson } from "../_lib/listening-translation-server";
import { TranslationPractice } from "./_components/translation-practice";

export const metadata: Metadata = { title: "Translation Practice | KaiwaUp" };

export default async function ListeningTranslationLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await getListeningTranslationLesson(lessonId);

  if (!lesson || lesson.content_type !== "listening_translation") {
    notFound();
  }

  return (
    <main className="px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
      <div className="mx-auto w-full max-w-[1200px]">
        <TranslationPractice
          audioUrl={lesson.audio_url ?? null}
          description={lesson.description ?? null}
          difficulty={lesson.difficulty}
          lessonId={lesson.id}
          title={lesson.title}
        />
      </div>
    </main>
  );
}
