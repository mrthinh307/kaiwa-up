import type { JlptDifficulty } from "@/types/practice-catalog";

export type DashboardPracticeMode = "dictation" | "shadowing";
export type DashboardAttemptStatus = "completed" | "in_progress";

type DashboardAttemptMock = {
  completed_at: string | null;
  content_title: string;
  id: string;
  practice_mode: DashboardPracticeMode;
  score: number | null;
  status: DashboardAttemptStatus;
};

type DashboardGamificationMock = {
  current_level_min_exp: number;
  exp_to_next_level: number;
  level: number;
  next_level_min_exp: number;
  total_exp: number;
};

type DashboardProgressMock = {
  dictation_attempts: number;
  dictation_completed: number;
  in_progress_lessons: Array<{
    attempt_number: number;
    content_title: string;
    difficulty: JlptDifficulty;
    id: string;
    practice_mode: DashboardPracticeMode;
  }>;
  shadowing_attempts: number;
  shadowing_completed: number;
  total_attempts: number;
};

export type DashboardViewModel = {
  attemptHistory: {
    items: Array<{
      completedAt: string | null;
      contentTitle: string;
      id: string;
      practiceMode: DashboardPracticeMode;
      score: number | null;
      status: DashboardAttemptStatus;
    }>;
    page: number;
    pageSize: number;
    pages: number;
    selectedPracticeMode?: DashboardPracticeMode;
    selectedStatus?: DashboardAttemptStatus;
    searchQuery?: string;
    total: number;
  };
  gamification: {
    currentLevelMinExp: number;
    expToNextLevel: number;
    level: number;
    nextLevelMinExp: number;
    totalExp: number;
  };
  progressSummary: {
    dictationAttempts: number;
    dictationCompleted: number;
    inProgressLessons: Array<{
      attemptNumber: number;
      contentTitle: string;
      difficulty: JlptDifficulty;
      id: string;
      practiceMode: DashboardPracticeMode;
    }>;
    shadowingAttempts: number;
    shadowingCompleted: number;
    totalAttempts: number;
  };
};

const DASHBOARD_PROGRESS_MOCK = {
  dictation_attempts: 15,
  dictation_completed: 8,
  in_progress_lessons: [
    {
      attempt_number: 1,
      content_title: "Shopping conversation",
      difficulty: "N5",
      id: "attempt-01",
      practice_mode: "shadowing",
    },
    {
      attempt_number: 2,
      content_title: "Today's weather forecast",
      difficulty: "N4",
      id: "attempt-02",
      practice_mode: "dictation",
    },
    {
      attempt_number: 1,
      content_title: "Introducing yourself at work",
      difficulty: "N3",
      id: "attempt-03",
      practice_mode: "shadowing",
    },
    {
      attempt_number: 3,
      content_title: "Ordering lunch at a restaurant",
      difficulty: "N4",
      id: "attempt-04",
      practice_mode: "dictation",
    },
  ],
  shadowing_attempts: 16,
  shadowing_completed: 12,
  total_attempts: 31,
} satisfies DashboardProgressMock;

const DASHBOARD_GAMIFICATION_MOCK = {
  current_level_min_exp: 100,
  exp_to_next_level: 100,
  level: 2,
  next_level_min_exp: 250,
  total_exp: 150,
} satisfies DashboardGamificationMock;

const DASHBOARD_ATTEMPT_TITLES = [
  "Shopping conversation",
  "Today's weather forecast",
  "Introducing yourself at work",
  "Ordering lunch at a restaurant",
  "Asking for train directions",
  "Making weekend plans",
  "Checking in at a hotel",
  "Buying tickets at the station",
  "Talking about daily routines",
  "Calling to change an appointment",
  "Discussing hobbies with a friend",
  "Finding an item in a convenience store",
] as const;

const DASHBOARD_ATTEMPTS_MOCK = Array.from({ length: 31 }, (_, index) => {
  const completedAt = new Date(Date.UTC(2026, 7, 10, 8) - index * 12 * 60 * 60 * 1000);
  const status: DashboardAttemptStatus = index < 4 ? "in_progress" : "completed";
  const practiceMode: DashboardPracticeMode = index % 2 === 0 ? "shadowing" : "dictation";
  const title =
    DASHBOARD_ATTEMPT_TITLES.at(index % DASHBOARD_ATTEMPT_TITLES.length) ??
    "Japanese conversation practice";

  return {
    completed_at: status === "completed" ? completedAt.toISOString() : null,
    content_title: title,
    id: `attempt-${String(index + 1).padStart(2, "0")}`,
    practice_mode: practiceMode,
    score: status === "completed" && index % 3 !== 0 ? 72 + ((index * 7) % 25) : null,
    status,
  } satisfies DashboardAttemptMock;
});

const DASHBOARD_ATTEMPT_PAGE_SIZE = 5;

function adaptDashboardMock({
  attempts,
  gamification,
  page,
  practiceMode,
  progress,
  searchQuery,
  status,
}: {
  attempts: DashboardAttemptMock[];
  gamification: DashboardGamificationMock;
  page: number;
  practiceMode?: DashboardPracticeMode;
  progress: DashboardProgressMock;
  searchQuery?: string;
  status?: DashboardAttemptStatus;
}): DashboardViewModel {
  const normalizedSearchQuery = searchQuery?.toLocaleLowerCase("en");
  const filteredAttempts = attempts.filter(
    (attempt) =>
      (!practiceMode || attempt.practice_mode === practiceMode) &&
      (!status || attempt.status === status) &&
      (!normalizedSearchQuery ||
        attempt.content_title.toLocaleLowerCase("en").includes(normalizedSearchQuery)),
  );
  const total = filteredAttempts.length;
  const pages = Math.max(Math.ceil(total / DASHBOARD_ATTEMPT_PAGE_SIZE), 1);
  const normalizedPage = Math.min(Math.max(page, 1), pages);
  const pageStart = (normalizedPage - 1) * DASHBOARD_ATTEMPT_PAGE_SIZE;
  const pageItems = filteredAttempts.slice(pageStart, pageStart + DASHBOARD_ATTEMPT_PAGE_SIZE);

  return {
    attemptHistory: {
      items: pageItems.map((attempt) => ({
        completedAt: attempt.completed_at,
        contentTitle: attempt.content_title,
        id: attempt.id,
        practiceMode: attempt.practice_mode,
        score: attempt.score,
        status: attempt.status,
      })),
      page: normalizedPage,
      pageSize: DASHBOARD_ATTEMPT_PAGE_SIZE,
      pages,
      selectedPracticeMode: practiceMode,
      selectedStatus: status,
      searchQuery,
      total,
    },
    gamification: {
      currentLevelMinExp: gamification.current_level_min_exp,
      expToNextLevel: gamification.exp_to_next_level,
      level: gamification.level,
      nextLevelMinExp: gamification.next_level_min_exp,
      totalExp: gamification.total_exp,
    },
    progressSummary: {
      dictationAttempts: progress.dictation_attempts,
      dictationCompleted: progress.dictation_completed,
      inProgressLessons: progress.in_progress_lessons.map((lesson) => ({
        attemptNumber: lesson.attempt_number,
        contentTitle: lesson.content_title,
        difficulty: lesson.difficulty,
        id: lesson.id,
        practiceMode: lesson.practice_mode,
      })),
      shadowingAttempts: progress.shadowing_attempts,
      shadowingCompleted: progress.shadowing_completed,
      totalAttempts: progress.total_attempts,
    },
  };
}

export function getDashboardMock({
  isEmpty = false,
  page = 1,
  practiceMode,
  searchQuery,
  status,
}: {
  isEmpty?: boolean;
  page?: number;
  practiceMode?: DashboardPracticeMode;
  searchQuery?: string;
  status?: DashboardAttemptStatus;
} = {}): DashboardViewModel {
  if (isEmpty) {
    return adaptDashboardMock({
      attempts: [],
      gamification: {
        current_level_min_exp: 0,
        exp_to_next_level: 100,
        level: 1,
        next_level_min_exp: 100,
        total_exp: 0,
      },
      page,
      practiceMode,
      progress: {
        dictation_attempts: 0,
        dictation_completed: 0,
        in_progress_lessons: [],
        shadowing_attempts: 0,
        shadowing_completed: 0,
        total_attempts: 0,
      },
      searchQuery,
      status,
    });
  }

  return adaptDashboardMock({
    attempts: DASHBOARD_ATTEMPTS_MOCK,
    gamification: DASHBOARD_GAMIFICATION_MOCK,
    page,
    practiceMode,
    progress: DASHBOARD_PROGRESS_MOCK,
    searchQuery,
    status,
  });
}
