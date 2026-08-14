"use client";

import type { FormEvent } from "react";

import { useEffect, useRef, useState } from "react";

import type { DictationAttemptResult, DictationPracticeLesson } from "../_types/dictation-practice";

import { submitDictationAttempt } from "../[lessonId]/actions";

function createEmptyAnswers(lesson: DictationPracticeLesson): Record<number, string> {
  return Object.fromEntries(lesson.blanks.map((blank) => [blank.blankIndex, ""]));
}

type UseDictationPracticeProps = {
  lesson: DictationPracticeLesson;
};

export function useDictationPractice({ lesson }: UseDictationPracticeProps) {
  const [answers, setAnswers] = useState<Record<number, string>>(() => createEmptyAnswers(lesson));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<DictationAttemptResult>();
  const [submitError, setSubmitError] = useState<string>();
  const practiceStartRef = useRef<HTMLDivElement>(null);
  const resultStartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!result) {
      return;
    }

    resultStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    resultStartRef.current?.focus({ preventScroll: true });
  }, [result]);

  const handleAnswerChange = (blankIndex: number, value: string) => {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [blankIndex]: value }));
    setSubmitError(undefined);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const areAllBlanksAnswered = lesson.blanks.every((blank) => answers[blank.blankIndex]?.trim());
    if (!areAllBlanksAnswered || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(undefined);

    try {
      const response = await submitDictationAttempt({
        answers: lesson.blanks.map((blank) => ({
          blankIndex: blank.blankIndex,
          userAnswer: answers[blank.blankIndex] ?? "",
        })),
        lessonId: lesson.id,
      });

      if (response.status === "error") {
        setSubmitError(response.message);
        return;
      }

      setResult(response.result);
    } catch {
      setSubmitError("We could not check your answers. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTryAgain = () => {
    setAnswers(createEmptyAnswers(lesson));
    setResult(undefined);
    setSubmitError(undefined);
    window.requestAnimationFrame(() => {
      practiceStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("dictation-blank-1")?.focus({ preventScroll: true });
    });
  };

  return {
    answers,
    handleAnswerChange,
    handleSubmit,
    handleTryAgain,
    isSubmitting,
    practiceStartRef,
    result,
    resultStartRef,
    submitError,
  };
}
