import type { Metadata } from "next";

import { ArrowLeft, Tag, TextCursorInput } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProtectedPageHeader } from "@/components/common/protected-route/protected-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  formatDictationAnswerCount,
  formatDictationExerciseType,
} from "../_utils/dictation-formatters";
import { getDictationPracticeLesson } from "../_utils/dictation-practice-mock";
import { DictationPracticeScreen } from "./_components/dictation-practice-screen";

type DictationLessonPageProps = {
  params: Promise<{ lessonId: string }>;
};

export async function generateMetadata({ params }: DictationLessonPageProps): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = getDictationPracticeLesson(lessonId);

  if (!lesson) {
    return { title: "Dictation lesson not found | KaiwaUp" };
  }

  return {
    description: `Practice Japanese Dictation with ${lesson.title}. Listen carefully, complete every blank, and review your result.`,
    title: `${lesson.title} | Dictation | KaiwaUp`,
  };
}

export default async function DictationLessonPage({ params }: DictationLessonPageProps) {
  const { lessonId } = await params;
  const lesson = getDictationPracticeLesson(lessonId);

  if (!lesson) {
    notFound();
  }

  return (
    <main className="px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
      <div className="mx-auto w-full max-w-[1300px]">
        <Button asChild size="sm" variant="neutral">
          <Link href="/lessons">
            <ArrowLeft aria-hidden="true" />
            Back to lessons
          </Link>
        </Button>

        <ProtectedPageHeader
          aside={
            <dl className="grid grid-cols-3 overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow lg:min-w-[420px]">
              <div className="p-3 text-center sm:p-4">
                <dt className="text-xs font-heading tracking-wide text-foreground/55 uppercase">
                  Practice mode
                </dt>
                <dd className="mt-1 font-heading text-lg">Dictation</dd>
              </div>
              <div className="border-l-2 border-border p-3 text-center sm:p-4">
                <dt className="text-xs font-heading tracking-wide text-foreground/55 uppercase">
                  JLPT Level
                </dt>
                <dd className="mt-1 font-heading text-lg">{lesson.difficulty}</dd>
              </div>
              <div className="border-l-2 border-border p-3 text-center sm:p-4">
                <dt className="text-xs font-heading tracking-wide text-foreground/55 uppercase">
                  Durations
                </dt>
                <dd className="mt-1 font-heading text-lg">{lesson.audioDurationSeconds}s</dd>
              </div>
            </dl>
          }
          className="mt-8"
          description={lesson.instruction}
          title={lesson.title}
        />

        <div className="mt-6 flex flex-wrap gap-2">
          <Badge className="gap-2" variant="neutral">
            <Tag aria-hidden="true" />
            {lesson.topic}
          </Badge>
          <Badge className="gap-2" variant="neutral">
            <TextCursorInput aria-hidden="true" />
            {formatDictationExerciseType(lesson.exerciseType)} ·{" "}
            {formatDictationAnswerCount({
              exerciseType: lesson.exerciseType,
              totalBlanks: lesson.blanks.length,
            })}
          </Badge>
        </div>

        <div className="mt-8">
          <DictationPracticeScreen lesson={lesson} />
        </div>
      </div>
    </main>
  );
}
