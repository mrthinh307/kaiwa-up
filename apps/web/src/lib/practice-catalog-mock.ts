import type { JlptDifficulty } from "@/types/practice-catalog";

export const PRACTICE_MODES = ["shadowing", "dictation"] as const;

export type PracticeMode = (typeof PRACTICE_MODES)[number];
export type PracticeLearningStatus = "learned" | "not_learned";

export type LearningContentFixture = {
  audioDurationMs: number;
  difficulty: JlptDifficulty;
  id: string;
  shortDescription: string;
  title: string;
  topic: string;
};

export type PracticeCatalogLesson = LearningContentFixture & {
  modes: LessonModeProgress[];
};

export type LessonModeProgress = {
  attemptCount: number;
  mode: PracticeMode;
};

export type PracticeCatalogViewModel = {
  items: PracticeCatalogLesson[];
  page: number;
  pageSize: number;
  pages: number;
  total: number;
};

const LEARNING_CONTENT_FIXTURES = [
  {
    audioDurationMs: 32_000,
    difficulty: "N5",
    id: "987e6543-e89b-12d3-a456-426614174999",
    shortDescription: "Practice the phrases you need for a quick everyday shopping trip.",
    title: "Shopping for everyday essentials",
    topic: "Daily life",
  },
  {
    audioDurationMs: 45_000,
    difficulty: "N5",
    id: "987e6543-e89b-12d3-a456-426614174001",
    shortDescription: "Build confidence introducing yourself in a friendly school setting.",
    title: "Introducing yourself at school",
    topic: "Introductions",
  },
  {
    audioDurationMs: 58_000,
    difficulty: "N4",
    id: "987e6543-e89b-12d3-a456-426614174004",
    shortDescription: "Catch the polite questions and answers used at a busy station.",
    title: "Asking for directions at the station",
    topic: "Directions",
  },
  {
    audioDurationMs: 72_000,
    difficulty: "N4",
    id: "987e6543-e89b-12d3-a456-426614174005",
    shortDescription: "Talk about the weather with natural everyday expressions.",
    title: "Talking about today’s weather",
    topic: "Weather",
  },
  {
    audioDurationMs: 91_000,
    difficulty: "N3",
    id: "987e6543-e89b-12d3-a456-426614174008",
    shortDescription: "Retell a recent trip with clear timing and useful detail.",
    title: "Sharing an experience from a recent trip",
    topic: "Travel stories",
  },
  {
    audioDurationMs: 98_000,
    difficulty: "N2",
    id: "987e6543-e89b-12d3-a456-426614174009",
    shortDescription: "Discuss a policy change and respond with professional language.",
    title: "Discussing a change in company policy",
    topic: "Business",
  },
  {
    audioDurationMs: 134_000,
    difficulty: "N1",
    id: "987e6543-e89b-12d3-a456-426614174014",
    shortDescription: "Present a nuanced academic position with clear supporting ideas.",
    title: "Presenting a nuanced argument clearly",
    topic: "Academic discussion",
  },
  {
    audioDurationMs: 18_000,
    difficulty: "N5",
    id: "770e8400-e29b-41d4-a716-446655440111",
    shortDescription: "Catch weather phrases in a short convenience-store exchange.",
    title: "Weather at the convenience store",
    topic: "Daily life",
  },
  {
    audioDurationMs: 16_000,
    difficulty: "N5",
    id: "770e8400-e29b-41d4-a716-446655440112",
    shortDescription: "Write the key details from a classroom self-introduction.",
    title: "Meeting a new classmate",
    topic: "Introductions",
  },
  {
    audioDurationMs: 22_000,
    difficulty: "N5",
    id: "770e8400-e29b-41d4-a716-446655440113",
    shortDescription: "Reconstruct a natural café order one phrase at a time.",
    title: "Ordering lunch at a café",
    topic: "Food and dining",
  },
  {
    audioDurationMs: 20_000,
    difficulty: "N4",
    id: "770e8400-e29b-41d4-a716-446655440114",
    shortDescription: "Fill in the phrases used to find the correct train platform.",
    title: "Finding the right train platform",
    topic: "Travel",
  },
  {
    audioDurationMs: 27_000,
    difficulty: "N4",
    id: "770e8400-e29b-41d4-a716-446655440115",
    shortDescription: "Listen for the expressions used to make and confirm weekend plans.",
    title: "Making plans for the weekend",
    topic: "Plans and invitations",
  },
  {
    audioDurationMs: 24_000,
    difficulty: "N4",
    id: "770e8400-e29b-41d4-a716-446655440116",
    shortDescription: "Complete a polite exchange about finding your way downtown.",
    title: "Asking for directions downtown",
    topic: "Directions",
  },
  {
    audioDurationMs: 35_000,
    difficulty: "N3",
    id: "770e8400-e29b-41d4-a716-446655440117",
    shortDescription: "Rebuild a workplace conversation about solving an unexpected problem.",
    title: "Explaining a problem at work",
    topic: "Workplace",
  },
  {
    audioDurationMs: 31_000,
    difficulty: "N3",
    id: "770e8400-e29b-41d4-a716-446655440118",
    shortDescription: "Capture the details in a story about a recent travel experience.",
    title: "Sharing a recent travel experience",
    topic: "Travel stories",
  },
  {
    audioDurationMs: 30_000,
    difficulty: "N3",
    id: "770e8400-e29b-41d4-a716-446655440119",
    shortDescription: "Compare two neighborhoods through a clear everyday conversation.",
    title: "Comparing two neighborhoods",
    topic: "City life",
  },
  {
    audioDurationMs: 39_000,
    difficulty: "N2",
    id: "770e8400-e29b-41d4-a716-446655440120",
    shortDescription: "Follow a professional response to a dissatisfied customer.",
    title: "Responding politely to a complaint",
    topic: "Customer service",
  },
  {
    audioDurationMs: 38_000,
    difficulty: "N2",
    id: "770e8400-e29b-41d4-a716-446655440121",
    shortDescription: "Reconstruct the main points of a business meeting summary.",
    title: "Summarizing the main point of a meeting",
    topic: "Business",
  },
  {
    audioDurationMs: 33_000,
    difficulty: "N2",
    id: "770e8400-e29b-41d4-a716-446655440122",
    shortDescription: "Catch the details in a public service announcement.",
    title: "Following a public service announcement",
    topic: "Public information",
  },
  {
    audioDurationMs: 52_000,
    difficulty: "N1",
    id: "770e8400-e29b-41d4-a716-446655440123",
    shortDescription: "Write the key ideas from a discussion about remote work.",
    title: "Examining different views on remote work",
    topic: "Society and work",
  },
  {
    audioDurationMs: 56_000,
    difficulty: "N1",
    id: "770e8400-e29b-41d4-a716-446655440124",
    shortDescription: "Follow a detailed news commentary and recover its missing phrases.",
    title: "Following a detailed news commentary",
    topic: "News and media",
  },
  {
    audioDurationMs: 61_000,
    difficulty: "N1",
    id: "770e8400-e29b-41d4-a716-446655440125",
    shortDescription: "Rebuild the logic of a nuanced academic argument.",
    title: "Understanding a nuanced academic argument",
    topic: "Academic discussion",
  },
] satisfies readonly LearningContentFixture[];

const MODE_ATTEMPT_COUNTS: Record<string, Partial<Record<PracticeMode, number>>> = {
  "987e6543-e89b-12d3-a456-426614174999": { shadowing: 1 },
  "987e6543-e89b-12d3-a456-426614174001": { shadowing: 3 },
  "987e6543-e89b-12d3-a456-426614174004": { shadowing: 1 },
  "987e6543-e89b-12d3-a456-426614174005": { shadowing: 0 },
  "987e6543-e89b-12d3-a456-426614174008": { shadowing: 2 },
  "987e6543-e89b-12d3-a456-426614174009": { shadowing: 5 },
  "987e6543-e89b-12d3-a456-426614174014": { shadowing: 0 },
  "770e8400-e29b-41d4-a716-446655440111": { dictation: 1, shadowing: 2 },
  "770e8400-e29b-41d4-a716-446655440112": { dictation: 3 },
  "770e8400-e29b-41d4-a716-446655440113": { dictation: 0, shadowing: 0 },
  "770e8400-e29b-41d4-a716-446655440114": { dictation: 0 },
  "770e8400-e29b-41d4-a716-446655440115": { dictation: 2, shadowing: 2 },
  "770e8400-e29b-41d4-a716-446655440116": { dictation: 4 },
  "770e8400-e29b-41d4-a716-446655440117": { dictation: 0, shadowing: 4 },
  "770e8400-e29b-41d4-a716-446655440118": { dictation: 3 },
  "770e8400-e29b-41d4-a716-446655440119": { dictation: 1, shadowing: 0 },
  "770e8400-e29b-41d4-a716-446655440120": { dictation: 0, shadowing: 1 },
  "770e8400-e29b-41d4-a716-446655440121": { dictation: 2, shadowing: 0 },
  "770e8400-e29b-41d4-a716-446655440122": { dictation: 5 },
  "770e8400-e29b-41d4-a716-446655440123": { dictation: 0, shadowing: 3 },
  "770e8400-e29b-41d4-a716-446655440124": { dictation: 1, shadowing: 2 },
  "770e8400-e29b-41d4-a716-446655440125": { dictation: 4 },
};

export function getLearningContent(contentId: string): LearningContentFixture | undefined {
  return LEARNING_CONTENT_FIXTURES.find((content) => content.id === contentId);
}

export function getLearningContentIds(): string[] {
  return LEARNING_CONTENT_FIXTURES.map((content) => content.id);
}

export function getModeAttemptCount(contentId: string, mode: PracticeMode): number {
  return MODE_ATTEMPT_COUNTS[contentId]?.[mode] ?? 0;
}

export function getPracticeTopics(): string[] {
  return [...new Set(LEARNING_CONTENT_FIXTURES.map((content) => content.topic))].sort((a, b) =>
    a.localeCompare(b, "en"),
  );
}

export function getPracticeCatalog({
  difficulty,
  learningStatus,
  page,
  searchQuery,
  topic,
}: {
  difficulty?: JlptDifficulty;
  learningStatus?: PracticeLearningStatus;
  page: number;
  searchQuery?: string;
  topic?: string;
}): PracticeCatalogViewModel {
  const normalizedSearchQuery = searchQuery?.toLocaleLowerCase("en");
  const normalizedTopic = topic?.toLocaleLowerCase("en");
  const filteredLessons = LEARNING_CONTENT_FIXTURES.filter(
    (content) =>
      (!difficulty || content.difficulty === difficulty) &&
      (!normalizedTopic || content.topic.toLocaleLowerCase("en") === normalizedTopic) &&
      (!normalizedSearchQuery ||
        content.title.toLocaleLowerCase("en").includes(normalizedSearchQuery) ||
        content.topic.toLocaleLowerCase("en").includes(normalizedSearchQuery) ||
        content.shortDescription.toLocaleLowerCase("en").includes(normalizedSearchQuery)),
  )
    .map((content) => ({
      ...content,
      modes: PRACTICE_MODES.map((mode) => ({
        attemptCount: getModeAttemptCount(content.id, mode),
        mode,
      })),
    }))
    .filter((lesson) => {
      if (!learningStatus) {
        return true;
      }

      const hasAttempt = lesson.modes.some((mode) => mode.attemptCount > 0);

      return learningStatus === "learned" ? hasAttempt : !hasAttempt;
    });
  const total = filteredLessons.length;
  const pageSize = 9;
  const pages = Math.ceil(total / pageSize);
  const safePage = pages === 0 ? 1 : Math.min(Math.max(page, 1), pages);
  const startIndex = (safePage - 1) * pageSize;

  return {
    items: filteredLessons.slice(startIndex, startIndex + pageSize),
    page: safePage,
    pageSize,
    pages,
    total,
  };
}
