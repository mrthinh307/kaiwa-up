import type { LucideIcon } from "lucide-react";
import type { FormEvent } from "react";

import type { JlptDifficulty } from "@/types/practice-catalog";

import { DICTATION_EXERCISE_TYPES } from "../_constants/dictation-constants";

export { DICTATION_EXERCISE_TYPES };

export type DictationExerciseType = (typeof DICTATION_EXERCISE_TYPES)[number];

export type DictationBlankPrompt = {
  blankIndex: number;
};

export type DictationPracticeLesson = {
  audioDurationSeconds: number;
  blanks: DictationBlankPrompt[];
  difficulty: JlptDifficulty;
  exerciseType: DictationExerciseType;
  id: string;
  instruction: string;
  nextLessonId?: string;
  promptParts: string[];
  title: string;
  topic: string;
  youtubeVideoId: string | null;
};

export type DictationAnswerInput = {
  blankIndex: number;
  userAnswer: string;
};

export type DictationBlankResult = DictationAnswerInput & {
  correctAnswer: string;
  isCorrect: boolean;
};

export type DictationAttemptResult = {
  attemptId: string;
  correctCount: number;
  expEarned: number;
  isPassed: boolean;
  lessonId: string;
  results: DictationBlankResult[];
  scorePercentage: number;
  totalQuestions: number;
  translation: string;
};

export type DictationSubmitResponse =
  | {
      fieldErrors: Record<number, string>;
      message: string;
      status: "error";
    }
  | {
      result: DictationAttemptResult;
      status: "success";
    };

export type DictationStep = {
  description: string;
  icon: LucideIcon;
  number: string;
  title: string;
};

export type DictationBlankInputProps = {
  blankIndex: number;
  disabled: boolean;
  inputSizeClass: string;
  onAnswerChange: (blankIndex: number, value: string) => void;
  placeholder: string;
  value: string;
};

export type DictationPromptInputsProps = {
  answers: Record<number, string>;
  isSubmitting: boolean;
  lesson: DictationPracticeLesson;
  onAnswerChange: (blankIndex: number, value: string) => void;
};

export type DictationAnswerFormProps = {
  answers: Record<number, string>;
  isSubmitting: boolean;
  lesson: DictationPracticeLesson;
  onAnswerChange: (blankIndex: number, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitError?: string;
};

export type DictationResultProps = {
  lesson: DictationPracticeLesson;
  onTryAgain: () => void;
  result: DictationAttemptResult;
};

export type ExpectedTranscriptProps = {
  lesson: DictationPracticeLesson;
  result: DictationAttemptResult;
};

export type DictationVideoPlayerProps = {
  className?: string;
  lessonTitle: string;
  youtubeVideoId: string | null;
};
