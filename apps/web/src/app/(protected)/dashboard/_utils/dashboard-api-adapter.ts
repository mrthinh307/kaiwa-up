import type {
  AttemptStatus,
  ContentType,
  GamificationProfileResponse,
  PaginatedResponseProgressAttemptItem,
  ProgressSummaryResponse,
} from "@kaiwa-app/api-client";

import type { JlptDifficulty } from "@/types/practice-catalog";

export type DashboardPracticeMode = ContentType;
export type DashboardAttemptStatus = AttemptStatus;

export type DashboardAttemptHistoryItem = {
  completedAt: string | null;
  contentId: string;
  contentTitle: string;
  id: string;
  practiceMode: DashboardPracticeMode;
  score: number | null;
  status: DashboardAttemptStatus;
};

export type DashboardInProgressLesson = {
  attemptNumber: number;
  contentId: string;
  contentTitle: string;
  difficulty: JlptDifficulty;
  id: string;
  practiceMode: DashboardPracticeMode;
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
    listeningTranslationCompleted: number;
    reflexCompleted: number;
    shadowingDictationCompleted: number;
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
        practiceMode: attempt.content_type,
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
        difficulty: lesson.difficulty,
        id: lesson.id,
        practiceMode: lesson.content_type,
      })),
      listeningTranslationCompleted: summary.listening_translation_completed,
      reflexCompleted: summary.reflex_completed,
      shadowingDictationCompleted: summary.shadowing_dictation_completed,
      totalAttempts: summary.total_attempts,
      totalCompletedAttempts: summary.total_completed_attempts,
    },
  };
}
