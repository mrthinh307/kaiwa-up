import type { DictationExerciseType } from "../_types/dictation-practice";

const DICTATION_EXERCISE_TYPE_LABELS: Record<DictationExerciseType, string> = {
  full_sentence: "Full sentence",
  multiple_words: "Multiple words",
  one_word: "One word",
};

export function formatDictationExerciseType(exerciseType: DictationExerciseType): string {
  return DICTATION_EXERCISE_TYPE_LABELS[exerciseType];
}

export function formatDictationAnswerCount({
  exerciseType,
  totalBlanks,
}: {
  exerciseType: DictationExerciseType;
  totalBlanks: number;
}): string {
  if (exerciseType === "full_sentence") {
    return totalBlanks === 1 ? "1 sentence" : `${totalBlanks} sentences`;
  }

  return totalBlanks === 1 ? "1 blank" : `${totalBlanks} blanks`;
}
