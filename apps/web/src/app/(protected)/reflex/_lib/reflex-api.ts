import type { JlptLevel } from "@kaiwa-app/api-client";

export type ReflexLessonSummary = {
  difficulty: JlptLevel;
  id: string;
  is_completed: boolean;
  title: string;
};
export type ReflexLessonList = {
  items: ReflexLessonSummary[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
};
export type ReflexLesson = {
  audio_url: string;
  id: string;
  prompt_ja: string;
  response_start_limit_seconds: number;
  scenario_ja: string;
  title: string;
};
export type ReflexEvaluation = {
  ai_feedback: { naturalness_evaluation: string; suggestions: string; transcribed_text: string };
  ai_score: number;
  attempt_id: string;
  exp_earned: number;
  is_on_time: boolean;
  lesson_id: string;
  next_review_at: string;
  next_review_days: number;
  response_start_ms: number;
};
export type DueReview = {
  due_at: string;
  last_score: number;
  lesson_id: string;
  lesson_title: string;
};

type DueReviewList = { due_count: number; items: DueReview[] };
type MockResult<T> = { data: T; error: undefined; response: undefined };

export const MOCK_AUDIO_URL = "mock:speech-synthesis";
const MOCK_DELAY_MS = 500;
const MOCK_LESSONS = [
  {
    audio_url: MOCK_AUDIO_URL,
    id: "330e8400-e29b-41d4-a716-446655440331",
    prompt_ja: "週末は何をする予定ですか？",
    response_start_limit_seconds: 3,
    scenario_ja: "週末の予定について",
    title: "Talking about weekend plans",
  },
  {
    audio_url: MOCK_AUDIO_URL,
    id: "330e8400-e29b-41d4-a716-446655440332",
    prompt_ja: "駅までどうやって行きますか？",
    response_start_limit_seconds: 3,
    scenario_ja: "交通手段について",
    title: "Getting to the station",
  },
  {
    audio_url: MOCK_AUDIO_URL,
    id: "330e8400-e29b-41d4-a716-446655440333",
    prompt_ja: "どこで会いましょうか？",
    response_start_limit_seconds: 3,
    scenario_ja: "待ち合わせ場所について",
    title: "Choosing a meeting place",
  },
  {
    audio_url: MOCK_AUDIO_URL,
    id: "330e8400-e29b-41d4-a716-446655440334",
    prompt_ja: "この料理を食べたことがありますか？",
    response_start_limit_seconds: 3,
    scenario_ja: "食べ物の経験について",
    title: "Talking about food experiences",
  },
  {
    audio_url: MOCK_AUDIO_URL,
    id: "330e8400-e29b-41d4-a716-446655440335",
    prompt_ja: "仕事で一番大切なことは何だと思いますか？",
    response_start_limit_seconds: 3,
    scenario_ja: "仕事の価値観について",
    title: "Discussing workplace values",
  },
] as const satisfies readonly ReflexLesson[];
const MOCK_DIFFICULTIES: JlptLevel[] = ["N5", "N5", "N4", "N3", "N2"];

function waitForMock(delay = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, delay));
}

function mockResult<T>(data: T): MockResult<T> {
  return { data, error: undefined, response: undefined };
}

export async function listReflexLessons(): Promise<MockResult<ReflexLessonList>> {
  await waitForMock();
  const items = MOCK_LESSONS.map((lesson, index) => ({
    difficulty: MOCK_DIFFICULTIES[index] ?? "N5",
    id: lesson.id,
    is_completed: index === 1 || index === 2,
    title: lesson.title,
  }));
  return mockResult({ items, page: 1, page_size: 20, total_items: items.length, total_pages: 1 });
}

export async function getReflexLesson(lessonId: string): Promise<MockResult<ReflexLesson>> {
  await waitForMock();
  return mockResult(MOCK_LESSONS.find((lesson) => lesson.id === lessonId) ?? MOCK_LESSONS[0]);
}

export async function listDueReviews(): Promise<MockResult<DueReviewList>> {
  await waitForMock();
  const now = Date.now();
  const items: DueReview[] = [
    {
      due_at: new Date(now - 60 * 60 * 1000).toISOString(),
      last_score: 74,
      lesson_id: MOCK_LESSONS[1].id,
      lesson_title: MOCK_LESSONS[1].title,
    },
    {
      due_at: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      last_score: 82,
      lesson_id: MOCK_LESSONS[2].id,
      lesson_title: MOCK_LESSONS[2].title,
    },
  ];
  return mockResult({ due_count: items.length, items });
}

export async function evaluateReflexLesson(
  lessonId: string,
  audioFile: Blob,
  responseStartMs: number,
): Promise<MockResult<ReflexEvaluation>> {
  void audioFile;
  await waitForMock(1_500);
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + 5);
  return mockResult({
    ai_feedback: {
      naturalness_evaluation:
        "Your response sounds natural and fits the context. The sentence ending is polite and clear.",
      suggestions: "Try adding 駅の前で to make the meeting location more specific.",
      transcribed_text: "駅の前で会いましょう。",
    },
    ai_score: 86,
    attempt_id: crypto.randomUUID(),
    exp_earned: 20,
    is_on_time: true,
    lesson_id: lessonId,
    next_review_at: nextReview.toISOString(),
    next_review_days: 5,
    response_start_ms: responseStartMs,
  });
}
