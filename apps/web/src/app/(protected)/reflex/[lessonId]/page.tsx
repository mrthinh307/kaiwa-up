import type { Metadata } from "next";

import { ReflexLessonLoader } from "./_components/reflex-lesson-loader";

export const metadata: Metadata = { title: "Reflex Practice | KaiwaUp" };

export default async function ReflexLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  return (
    <main className="px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-[1000px]">
        <ReflexLessonLoader lessonId={lessonId} />
      </div>
    </main>
  );
}
