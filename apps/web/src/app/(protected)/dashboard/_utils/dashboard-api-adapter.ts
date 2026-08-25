import type {
  AttemptStatus,
  ContentType,
  GamificationProfileResponse,
  PaginatedResponseProgressAttemptItem,
  PracticeMethod,
  ProgressSummaryResponse,
} from "@kaiwa-app/api-client";

import type { JlptDifficulty } from "@/types/practice-catalog";

export type DashboardPracticeMode = PracticeMethod;
export type DashboardAttemptStatus = AttemptStatus;

export type DashboardAttemptHistoryItem = {
  completedAt: string | null;
  contentId: string;
  contentTitle: string;
  id: string;
  practiceMode: DashboardPracticeMode | null;
  score: number | null;
  status: DashboardAttemptStatus;
};

export type DashboardInProgressLesson = {
  attemptNumber: number;
  contentId: string;
  contentTitle: string;
  contentType: ContentType;
  difficulty: JlptDifficulty;
  id: string;
  practiceMode: DashboardPracticeMode | null;
};

export type DashboardViewModel = {
  attemptHistory: {
    items: DashboardAttemptHistoryItem[];
    page: number;
    pageSize: number;
    pages: number;
    selectedMode?: DashboardPracticeMode;
    selectedStatus?: DashboardAttemptStatus;
    searchQuery?: string;
    total: number;
  };
  gamification: {
    currentLevelMinExp: number;
    expToNextLevel: number;
    level: number;
    nextLevelMinExp: number | null;
    totalExp: number;
  };
  progressSummary: {
    inProgressLessons: DashboardInProgressLesson[];
    dictationCompleted: number;
    legacyShadowingDictationCompleted: number;
    listeningTranslationCompleted: number;
    reflexCompleted: number;
    shadowingCompleted: number;
    totalAttempts: number;
    totalCompletedAttempts: number;
  };
};

export function adaptDashboardData({
  attempts,
  gamification,
  mode,
  searchQuery,
  status,
  summary,
}: {
  attempts: PaginatedResponseProgressAttemptItem;
  gamification: GamificationProfileResponse;
  mode?: DashboardPracticeMode;
  searchQuery?: string;
  status?: DashboardAttemptStatus;
  summary: ProgressSummaryResponse;
}): DashboardViewModel {
  const pages = Math.max(attempts.total_pages, 1);
  const page = Math.min(Math.max(attempts.page, 1), pages);

  return {
    attemptHistory: {
      items: attempts.items.map((attempt) => ({
        completedAt: attempt.completed_at ?? null,
        contentId: attempt.content_id,
        contentTitle: attempt.content_title,
        id: attempt.id,
        practiceMode: attempt.practice_method,
        score: attempt.score ?? null,
        status: attempt.status,
      })),
      page,
      pageSize: attempts.page_size,
      pages,
      selectedMode: mode,
      selectedStatus: status,
      searchQuery,
      total: attempts.total_items,
    },
    gamification: {
      currentLevelMinExp: gamification.current_level_min_exp,
      expToNextLevel: gamification.exp_to_next_level,
      level: gamification.level,
      nextLevelMinExp: gamification.next_level_min_exp ?? null,
      totalExp: gamification.total_exp,
    },
    progressSummary: {
      inProgressLessons: (summary.in_progress_lessons ?? []).map((lesson) => ({
        attemptNumber: lesson.attempt_number,
        contentId: lesson.content_id,
        contentTitle: lesson.content_title,
        contentType: lesson.content_type,
        difficulty: lesson.difficulty,
        id: lesson.id,
        practiceMode: lesson.practice_method,
      })),
      dictationCompleted: summary.dictation_completed,
      legacyShadowingDictationCompleted: Math.max(
        summary.shadowing_dictation_completed -
          summary.shadowing_completed -
          summary.dictation_completed,
        0,
      ),
      listeningTranslationCompleted: summary.listening_translation_completed,
      reflexCompleted: summary.reflex_completed,
      shadowingCompleted: summary.shadowing_completed,
      totalAttempts: summary.total_attempts,
      totalCompletedAttempts: summary.total_completed_attempts,
    },
  };
}
