import type { Metadata } from "next";

import { client, getShadowingContent } from "@kaiwa-app/api-client";
import { notFound, redirect } from "next/navigation";

import { ShadowingScreen } from "../_components/shadowing-screen";

type ShadowingLessonPageProps = {
  params: Promise<{ lessonId: string }>;
};

async function fetchShadowingLesson(lessonId: string) {
  client.setConfig({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  });

  try {
    const response = await getShadowingContent({
      path: { content_id: lessonId },
    });
    return response.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ShadowingLessonPageProps): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = await fetchShadowingLesson(lessonId);

  if (!lesson) {
    return { title: "Lesson Not Found | KaiwaUp" };
  }

  return {
    description:
      lesson.description ??
      "Practice Japanese listening and speaking reflexes with dual audio shadowing and self-comparison.",
    title: `${lesson.title} | Shadowing | KaiwaUp`,
  };
}

export default async function ShadowingLessonPage({ params }: ShadowingLessonPageProps) {
  const { lessonId } = await params;
  const lesson = await fetchShadowingLesson(lessonId);

  if (!lesson) {
    notFound();
  }

  if (lesson.content_type !== "shadowing_dictation") {
    redirect("/lessons");
  }

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1280px]">
        <ShadowingScreen lesson={lesson} />
      </div>
    </main>
  );
}
