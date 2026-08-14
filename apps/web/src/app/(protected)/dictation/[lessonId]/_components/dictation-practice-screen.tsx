"use client";

import type { DictationPracticeLesson } from "../../_types/dictation-practice";

import { useDictationPractice } from "../../_hooks/use-dictation-practice";
import { DictationAnswerForm } from "./dictation-answer-form";
import { DictationResult } from "./dictation-result";
import { DictationVideoPlayer } from "./dictation-video-player";

type DictationPracticeScreenProps = {
  lesson: DictationPracticeLesson;
};

export function DictationPracticeScreen({ lesson }: DictationPracticeScreenProps) {
  const {
    answers,
    handleAnswerChange,
    handleSubmit,
    handleTryAgain,
    isSubmitting,
    practiceStartRef,
    result,
    resultStartRef,
    submitError,
  } = useDictationPractice({ lesson });

  return (
    <div ref={practiceStartRef}>
      {result ? (
        <div className="scroll-mt-8 outline-none" ref={resultStartRef} tabIndex={-1}>
          <DictationResult lesson={lesson} onTryAgain={handleTryAgain} result={result} />
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="lg:sticky lg:top-24 lg:col-span-5 lg:z-20">
            <DictationVideoPlayer
              lessonTitle={lesson.title}
              youtubeVideoId={lesson.youtubeVideoId}
            />
          </div>

          <div className="lg:col-span-7">
            <DictationAnswerForm
              answers={answers}
              isSubmitting={isSubmitting}
              lesson={lesson}
              onAnswerChange={handleAnswerChange}
              onSubmit={handleSubmit}
              submitError={submitError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
