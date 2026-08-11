import type { JlptDifficulty } from "@/types/practice-catalog";

export const DICTATION_EXERCISE_TYPES = ["one_word", "multiple_words", "full_sentence"] as const;

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
};

export type DictationAnswerInput = {
  blankIndex: number;
  userAnswer: string;
};

export type DictationBlankResult = DictationAnswerInput & {
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
};

export type DictationAttemptResult = {
  attemptId: string;
  correctCount: number;
  expEarned: number;
  fullTranscript: string;
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
