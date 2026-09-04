import type {
  DictationAttemptReviewResponse,
  DictationCompleteResponse,
  DictationContentDetail,
  DictationResumeResponse,
  DictationSegmentCheckResponse,
  DictationSegmentItem,
  DictationStartResponse,
} from "@kaiwa-app/api-client";
import type { FormEvent } from "react";

export type DictationPracticeContent = DictationContentDetail;

export type DictationSegmentState = "correct" | "draft" | "incorrect" | "not_started";

export type DictationSegmentMapResult = Pick<
  DictationSegmentCheckResponse,
  "is_correct" | "user_answer"
>;

export type DictationKeyboardShortcut = {
  action: string;
  keyLabel: string;
};

export type DictationStartPanelProps = {
  content: DictationPracticeContent;
  inProgressAttempt?: DictationResumeResponse | null;
  isRestoring: boolean;
  isStarting: boolean;
  onRestore: () => void;
  onResume: () => void;
  onStart: () => void;
  restoreError?: string;
  startError?: string;
  totalAttempts?: number;
};

export type CompactPracticeToolbarProps = {
  autoPlayDelayMs: number;
  autoPlayOnSegmentChange: boolean;
  checkedCount: number;
  correctCount: number;
  difficulty: string;
  draftCount: number;
  isCompleting: boolean;
  lessonTitle: string;
  onAutoPlayDelayChange: (value: number) => void;
  onAutoPlayOnSegmentChange: (value: boolean) => void;
  onComplete: () => void;
  onShowVideoChange: (value: boolean) => void;
  onShowCorrectAnswerChange: (value: boolean) => void;
  showVideo: boolean;
  showCorrectAnswer: boolean;
  storedResultCount: number;
  totalSegments: number;
};

export type DictationWorkstationProps = {
  activeAnswer: string;
  activeResult?: DictationSegmentCheckResponse;
  activeSegment: DictationSegmentItem;
  activeSegmentIndex: number;
  audioUrl: string;
  autoPlayDelayMs: number;
  autoPlayOnSegmentChange: boolean;
  hasPlayedActiveSegment: boolean;
  isChecking: boolean;
  isFirstSegment: boolean;
  isLastSegment: boolean;
  lessonTitle: string;
  onAnswerChange: (value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onReplay: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  playbackRequest: number;
  showVideo: boolean;
  showCorrectAnswer: boolean;
  submitError?: string;
  totalSegments: number;
};

export type DictationPracticeSidebarProps = {
  activeSegmentIndex: number;
  answers: Record<number, string>;
  checkedCount: number;
  correctCount: number;
  draftCount: number;
  hideCompletionCard?: boolean;
  hideStats?: boolean;
  isCompleting: boolean;
  keyboardShortcuts?: readonly DictationKeyboardShortcut[];
  onComplete: () => void;
  onSelectSegment: (segmentIndex: number) => void;
  results: Record<number, DictationSegmentMapResult>;
  segments: DictationSegmentItem[];
  showVideo?: boolean;
  storedResultCount: number;
  totalSegments: number;
  variant?: "practice" | "result";
  youtubeVideoId?: string;
};

export type DictationResultProps = {
  attempt: DictationStartResponse;
  completion: DictationCompleteResponse;
  content: DictationPracticeContent;
  isStarting: boolean;
  onTryAgain: () => void;
  review: DictationAttemptReviewResponse;
  shouldCelebrate?: boolean;
  startError?: string;
};
