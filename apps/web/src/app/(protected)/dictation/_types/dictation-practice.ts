import type {
  DictationAttemptReviewResponse,
  DictationCompleteResponse,
  DictationContentDetail,
  DictationSegmentCheckRequest,
  DictationSegmentCheckResponse,
  DictationSegmentItem,
  DictationStartResponse,
} from "@kaiwa-app/api-client";
import type { FormEvent } from "react";

export type DictationPracticeContent = DictationContentDetail;
export type DictationPracticeRequest = DictationSegmentCheckRequest;

export type DictationStartActionResponse =
  | {
      code: "content_not_found" | "content_unavailable" | "unknown_error";
      message: string;
      status: "error";
    }
  | {
      attempt: DictationStartResponse;
      status: "success";
    };

export type DictationCheckResponse =
  | {
      code:
        | "attempt_forbidden"
        | "attempt_not_found"
        | "attempt_not_in_progress"
        | "invalid_segment_index"
        | "unknown_error";
      message: string;
      status: "error";
    }
  | {
      result: DictationSegmentCheckResponse;
      status: "success";
    };

export type DictationCompleteActionResponse =
  | {
      code:
        | "attempt_forbidden"
        | "attempt_not_found"
        | "attempt_not_in_progress"
        | "content_unavailable"
        | "unknown_error";
      message: string;
      status: "error";
    }
  | {
      completion: DictationCompleteResponse;
      review: DictationAttemptReviewResponse;
      status: "success";
    };

export type DictationInProgressInfo = {
  attempt: DictationStartResponse;
  checkedCount: number;
  results: Record<number, DictationSegmentCheckResponse>;
};

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
  inProgressInfo?: DictationInProgressInfo;
  isStarting: boolean;
  onResume?: () => void;
  onStart: () => void;
  startError?: string;
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
  isCompleting: boolean;
  keyboardShortcuts?: readonly DictationKeyboardShortcut[];
  onComplete: () => void;
  onSelectSegment: (segmentIndex: number) => void;
  results: Record<number, DictationSegmentMapResult>;
  segments: DictationSegmentItem[];
  storedResultCount: number;
  totalSegments: number;
  variant?: "practice" | "result";
};

export type DictationResultProps = {
  attempt: DictationStartResponse;
  completion: DictationCompleteResponse;
  content: DictationPracticeContent;
  isStarting: boolean;
  onTryAgain: () => void;
  review: DictationAttemptReviewResponse;
  startError?: string;
};
