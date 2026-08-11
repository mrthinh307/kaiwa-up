import type { JlptDifficulty } from "@/types/practice-catalog";

export const PRACTICE_CONTENT_TYPES = ["shadowing", "dictation"] as const;

export type PracticeContentType = (typeof PRACTICE_CONTENT_TYPES)[number];

export type LearningContentFixture = {
  audioDurationMs: number;
  contentType: PracticeContentType;
  difficulty: JlptDifficulty;
  id: string;
  shortDescription: string;
  title: string;
  topic: string;
};

export type PracticeCatalogLesson = LearningContentFixture & {
  attemptCount: number;
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
    contentType: "shadowing",
    difficulty: "N5",
    id: "987e6543-e89b-12d3-a456-426614174999",
    shortDescription: "Practice the phrases you need for a quick everyday shopping trip.",
    title: "Shopping for everyday essentials",
    topic: "Daily life",
  },
  {
    audioDurationMs: 45_000,
    contentType: "shadowing",
    difficulty: "N5",
    id: "987e6543-e89b-12d3-a456-426614174001",
    shortDescription: "Build confidence introducing yourself in a friendly school setting.",
    title: "Introducing yourself at school",
    topic: "Introductions",
  },
  {
    audioDurationMs: 54_000,
    contentType: "shadowing",
    difficulty: "N5",
    id: "987e6543-e89b-12d3-a456-426614174002",
    shortDescription: "Follow a natural café order from greeting to payment.",
    title: "Ordering lunch at a café",
    topic: "Food and dining",
  },
  {
    audioDurationMs: 63_000,
    contentType: "shadowing",
    difficulty: "N4",
    id: "987e6543-e89b-12d3-a456-426614174003",
    shortDescription: "Listen for the phrases used to suggest and confirm weekend plans.",
    title: "Making plans for the weekend",
    topic: "Plans and invitations",
  },
  {
    audioDurationMs: 58_000,
    contentType: "shadowing",
    difficulty: "N4",
    id: "987e6543-e89b-12d3-a456-426614174004",
    shortDescription: "Catch the polite questions and answers used at a busy station.",
    title: "Asking for directions at the station",
    topic: "Directions",
  },
  {
    audioDurationMs: 72_000,
    contentType: "shadowing",
    difficulty: "N4",
    id: "987e6543-e89b-12d3-a456-426614174005",
    shortDescription: "Talk about the weather with natural everyday expressions.",
    title: "Talking about today’s weather",
    topic: "Weather",
  },
  {
    audioDurationMs: 78_000,
    contentType: "shadowing",
    difficulty: "N3",
    id: "987e6543-e89b-12d3-a456-426614174006",
    shortDescription: "Explain a workplace issue clearly and calmly.",
    title: "Explaining a problem at work",
    topic: "Workplace",
  },
  {
    audioDurationMs: 86_000,
    contentType: "shadowing",
    difficulty: "N3",
    id: "987e6543-e89b-12d3-a456-426614174007",
    shortDescription: "Compare city neighborhoods and share what makes each one different.",
    title: "Comparing two neighborhoods",
    topic: "City life",
  },
  {
    audioDurationMs: 91_000,
    contentType: "shadowing",
    difficulty: "N3",
    id: "987e6543-e89b-12d3-a456-426614174008",
    shortDescription: "Retell a recent trip with clear timing and useful detail.",
    title: "Sharing an experience from a recent trip",
    topic: "Travel stories",
  },
  {
    audioDurationMs: 98_000,
    contentType: "shadowing",
    difficulty: "N2",
    id: "987e6543-e89b-12d3-a456-426614174009",
    shortDescription: "Discuss a policy change and respond with professional language.",
    title: "Discussing a change in company policy",
    topic: "Business",
  },
  {
    audioDurationMs: 104_000,
    contentType: "shadowing",
    difficulty: "N2",
    id: "987e6543-e89b-12d3-a456-426614174010",
    shortDescription: "Practice calm, respectful language for handling a customer complaint.",
    title: "Responding politely to a complaint",
    topic: "Customer service",
  },
  {
    audioDurationMs: 112_000,
    contentType: "shadowing",
    difficulty: "N2",
    id: "987e6543-e89b-12d3-a456-426614174011",
    shortDescription: "Summarize the key points and decisions from a business meeting.",
    title: "Summarizing the main point of a meeting",
    topic: "Business",
  },
  {
    audioDurationMs: 118_000,
    contentType: "shadowing",
    difficulty: "N1",
    id: "987e6543-e89b-12d3-a456-426614174012",
    shortDescription: "Explore different opinions about how remote work is changing society.",
    title: "Examining different views on remote work",
    topic: "Society and work",
  },
  {
    audioDurationMs: 126_000,
    contentType: "shadowing",
    difficulty: "N1",
    id: "987e6543-e89b-12d3-a456-426614174013",
    shortDescription: "Follow a detailed commentary and identify its key facts and opinions.",
    title: "Following a detailed news commentary",
    topic: "News and media",
  },
  {
    audioDurationMs: 134_000,
    contentType: "shadowing",
    difficulty: "N1",
    id: "987e6543-e89b-12d3-a456-426614174014",
    shortDescription: "Present a nuanced academic position with clear supporting ideas.",
    title: "Presenting a nuanced argument clearly",
    topic: "Academic discussion",
  },
  {
    audioDurationMs: 18_000,
    contentType: "dictation",
    difficulty: "N5",
    id: "770e8400-e29b-41d4-a716-446655440111",
    shortDescription: "Catch weather phrases in a short convenience-store exchange.",
    title: "Weather at the convenience store",
    topic: "Daily life",
  },
  {
    audioDurationMs: 16_000,
    contentType: "dictation",
    difficulty: "N5",
    id: "770e8400-e29b-41d4-a716-446655440112",
    shortDescription: "Write the key details from a classroom self-introduction.",
    title: "Meeting a new classmate",
    topic: "Introductions",
  },
  {
    audioDurationMs: 22_000,
    contentType: "dictation",
    difficulty: "N5",
    id: "770e8400-e29b-41d4-a716-446655440113",
    shortDescription: "Reconstruct a natural café order one phrase at a time.",
    title: "Ordering lunch at a café",
    topic: "Food and dining",
  },
  {
    audioDurationMs: 20_000,
    contentType: "dictation",
    difficulty: "N4",
    id: "770e8400-e29b-41d4-a716-446655440114",
    shortDescription: "Fill in the phrases used to find the correct train platform.",
    title: "Finding the right train platform",
    topic: "Travel",
  },
  {
    audioDurationMs: 27_000,
    contentType: "dictation",
    difficulty: "N4",
    id: "770e8400-e29b-41d4-a716-446655440115",
    shortDescription: "Listen for the expressions used to make and confirm weekend plans.",
    title: "Making plans for the weekend",
    topic: "Plans and invitations",
  },
  {
    audioDurationMs: 24_000,
    contentType: "dictation",
    difficulty: "N4",
    id: "770e8400-e29b-41d4-a716-446655440116",
    shortDescription: "Complete a polite exchange about finding your way downtown.",
    title: "Asking for directions downtown",
    topic: "Directions",
  },
  {
    audioDurationMs: 35_000,
    contentType: "dictation",
    difficulty: "N3",
    id: "770e8400-e29b-41d4-a716-446655440117",
    shortDescription: "Rebuild a workplace conversation about solving an unexpected problem.",
    title: "Explaining a problem at work",
    topic: "Workplace",
  },
  {
    audioDurationMs: 31_000,
    contentType: "dictation",
    difficulty: "N3",
    id: "770e8400-e29b-41d4-a716-446655440118",
    shortDescription: "Capture the details in a story about a recent travel experience.",
    title: "Sharing a recent travel experience",
    topic: "Travel stories",
  },
  {
    audioDurationMs: 30_000,
    contentType: "dictation",
    difficulty: "N3",
    id: "770e8400-e29b-41d4-a716-446655440119",
    shortDescription: "Compare two neighborhoods through a clear everyday conversation.",
    title: "Comparing two neighborhoods",
    topic: "City life",
  },
  {
    audioDurationMs: 39_000,
    contentType: "dictation",
    difficulty: "N2",
    id: "770e8400-e29b-41d4-a716-446655440120",
    shortDescription: "Follow a professional response to a dissatisfied customer.",
    title: "Responding politely to a complaint",
    topic: "Customer service",
  },
  {
    audioDurationMs: 38_000,
    contentType: "dictation",
    difficulty: "N2",
    id: "770e8400-e29b-41d4-a716-446655440121",
    shortDescription: "Reconstruct the main points of a business meeting summary.",
    title: "Summarizing the main point of a meeting",
    topic: "Business",
  },
  {
    audioDurationMs: 33_000,
    contentType: "dictation",
    difficulty: "N2",
    id: "770e8400-e29b-41d4-a716-446655440122",
    shortDescription: "Catch the details in a public service announcement.",
    title: "Following a public service announcement",
    topic: "Public information",
  },
  {
    audioDurationMs: 52_000,
    contentType: "dictation",
    difficulty: "N1",
    id: "770e8400-e29b-41d4-a716-446655440123",
    shortDescription: "Write the key ideas from a discussion about remote work.",
    title: "Examining different views on remote work",
    topic: "Society and work",
  },
  {
    audioDurationMs: 56_000,
    contentType: "dictation",
    difficulty: "N1",
    id: "770e8400-e29b-41d4-a716-446655440124",
    shortDescription: "Follow a detailed news commentary and recover its missing phrases.",
    title: "Following a detailed news commentary",
    topic: "News and media",
  },
  {
    audioDurationMs: 61_000,
    contentType: "dictation",
    difficulty: "N1",
    id: "770e8400-e29b-41d4-a716-446655440125",
    shortDescription: "Rebuild the logic of a nuanced academic argument.",
    title: "Understanding a nuanced academic argument",
    topic: "Academic discussion",
  },
] satisfies readonly LearningContentFixture[];

const ATTEMPT_COUNTS_BY_CONTENT_ID: Record<string, number> = {
  "987e6543-e89b-12d3-a456-426614174999": 1,
  "987e6543-e89b-12d3-a456-426614174001": 3,
  "987e6543-e89b-12d3-a456-426614174002": 0,
  "987e6543-e89b-12d3-a456-426614174003": 2,
  "987e6543-e89b-12d3-a456-426614174004": 1,
  "987e6543-e89b-12d3-a456-426614174005": 0,
  "987e6543-e89b-12d3-a456-426614174006": 4,
  "987e6543-e89b-12d3-a456-426614174007": 0,
  "987e6543-e89b-12d3-a456-426614174008": 2,
  "987e6543-e89b-12d3-a456-426614174009": 5,
  "987e6543-e89b-12d3-a456-426614174010": 1,
  "987e6543-e89b-12d3-a456-426614174011": 0,
  "987e6543-e89b-12d3-a456-426614174012": 3,
  "987e6543-e89b-12d3-a456-426614174013": 2,
  "987e6543-e89b-12d3-a456-426614174014": 0,
  "770e8400-e29b-41d4-a716-446655440111": 1,
  "770e8400-e29b-41d4-a716-446655440112": 3,
  "770e8400-e29b-41d4-a716-446655440113": 0,
  "770e8400-e29b-41d4-a716-446655440114": 0,
  "770e8400-e29b-41d4-a716-446655440115": 2,
  "770e8400-e29b-41d4-a716-446655440116": 4,
  "770e8400-e29b-41d4-a716-446655440117": 0,
  "770e8400-e29b-41d4-a716-446655440118": 3,
  "770e8400-e29b-41d4-a716-446655440119": 1,
  "770e8400-e29b-41d4-a716-446655440120": 0,
  "770e8400-e29b-41d4-a716-446655440121": 2,
  "770e8400-e29b-41d4-a716-446655440122": 5,
  "770e8400-e29b-41d4-a716-446655440123": 0,
  "770e8400-e29b-41d4-a716-446655440124": 1,
  "770e8400-e29b-41d4-a716-446655440125": 4,
};

export function getLearningContent(contentId: string): LearningContentFixture | undefined {
  return LEARNING_CONTENT_FIXTURES.find((content) => content.id === contentId);
}

export function getLearningContentIds(contentType: PracticeContentType): string[] {
  return LEARNING_CONTENT_FIXTURES.filter((content) => content.contentType === contentType).map(
    (content) => content.id,
  );
}

export function getPracticeCatalog({
  contentType,
  difficulty,
  page,
  searchQuery,
}: {
  contentType: PracticeContentType;
  difficulty?: JlptDifficulty;
  page: number;
  searchQuery?: string;
}): PracticeCatalogViewModel {
  const normalizedSearchQuery = searchQuery?.toLocaleLowerCase("en");
  const filteredLessons = LEARNING_CONTENT_FIXTURES.filter(
    (content) =>
      content.contentType === contentType &&
      (!difficulty || content.difficulty === difficulty) &&
      (!normalizedSearchQuery ||
        content.title.toLocaleLowerCase("en").includes(normalizedSearchQuery) ||
        content.topic.toLocaleLowerCase("en").includes(normalizedSearchQuery) ||
        content.shortDescription.toLocaleLowerCase("en").includes(normalizedSearchQuery)),
  ).map((content) => ({
    ...content,
    attemptCount: ATTEMPT_COUNTS_BY_CONTENT_ID[content.id] ?? 0,
  }));
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
