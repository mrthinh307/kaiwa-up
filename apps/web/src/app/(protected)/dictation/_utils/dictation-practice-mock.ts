import "server-only";

import type {
  DictationAttemptReviewResponse,
  DictationCompleteResponse,
  DictationContentDetail,
  DictationSegmentCheckResponse,
  DictationStartResponse,
} from "@kaiwa-app/api-client";

import type { DictationPracticeRequest } from "../_types/dictation-practice";

type PrivateTranscriptSegment = {
  endTimeMs: number;
  script: string;
  startTimeMs: number;
};

const CONTENT_ID = "019fff97-c567-7e97-8b29-57b2ff7e0d5d";
const ATTEMPT_ID = "019fff9d-0c6a-7a2d-9154-46289fa845bd";
const MOCK_BASE_EXP = 50;

type MockAttemptState = {
  completedAt?: string;
  results: Map<number, DictationSegmentCheckResponse>;
  status: "completed" | "in_progress";
};

declare global {
  var kaiwaDictationMockAttemptState: MockAttemptState | undefined;
}

const mockAttemptState: MockAttemptState =
  globalThis.kaiwaDictationMockAttemptState ??
  (globalThis.kaiwaDictationMockAttemptState = {
    results: new Map(),
    status: "in_progress",
  });

const PRIVATE_TRANSCRIPT = [
  {
    endTimeMs: 7_866,
    script: "こんにちは。 今日はキャンプについてゆっくり話します。",
    startTimeMs: 680,
  },
  {
    endTimeMs: 16_520,
    script: "私はキャンプが好きです。 自然の中で過ごすのが楽しいです。",
    startTimeMs: 7_866,
  },
  {
    endTimeMs: 25_920,
    script: "キャンプ場に着いたらまずテントを立てます。 暗くなるとランタンをつけます。",
    startTimeMs: 16_520,
  },
  {
    endTimeMs: 33_261,
    script: "あたたかい光がきれいです。 夜は寝袋で寝ます。",
    startTimeMs: 25_920,
  },
  {
    endTimeMs: 40_760,
    script: "あたたかくて気持ちがいいです。 外で料理をします。",
    startTimeMs: 33_261,
  },
  {
    endTimeMs: 52_760,
    script: "焼いたお肉はとてもおいしいです。 家族や友だちと食事をします。 会話も楽しいです。",
    startTimeMs: 40_760,
  },
  {
    endTimeMs: 61_680,
    script: "キャンプで食べるカレーはとても人気があります。 夜は焚き火をします。 火を見る",
    startTimeMs: 52_760,
  },
  {
    endTimeMs: 73_200,
    script: "と落ち着きます。 花火を楽しみます。 明るい光がとてもきれいです。 みんなで話し",
    startTimeMs: 61_680,
  },
  {
    endTimeMs: 84_320,
    script: "たり歌ったりします。 楽しい時間です。 静かな夜のキャンプ場もとてもすてきです。",
    startTimeMs: 73_200,
  },
  {
    endTimeMs: 92_399,
    script: "朝は森を散歩します。 空気が新鮮で気持ちいいです。",
    startTimeMs: 84_320,
  },
  {
    endTimeMs: 100_414,
    script: "湖の近くは静かです。 ゆっくり休むことができます。",
    startTimeMs: 92_399,
  },
  {
    endTimeMs: 112_280,
    script: "冬のキャンプも人気です。 雪の景色はとてもきれいです。 秋のキャンプも楽しいです。",
    startTimeMs: 100_414,
  },
  {
    endTimeMs: 119_880,
    script: "色づいた葉が見られます。 キャンプでは虫を見つけます。",
    startTimeMs: 112_280,
  },
  {
    endTimeMs: 127_719,
    script: "自然を近くに感じます。 川で遊ぶのも楽しいです。",
    startTimeMs: 119_880,
  },
  {
    endTimeMs: 135_080,
    script: "冷たい水が気持ちいいです。 釣りを楽しむ人もいます。",
    startTimeMs: 127_719,
  },
  {
    endTimeMs: 144_440,
    script: "魚が釣れるとうれしいです。 夜空には星が見えます。 キャンプの楽しみ",
    startTimeMs: 135_080,
  },
  {
    endTimeMs: 151_640,
    script: "の一つです。 キャンプの思い出はずっと心に残ります。",
    startTimeMs: 144_440,
  },
  {
    endTimeMs: 162_068,
    script: "キャンプはとても楽しいです。 ぜひ行ってみてください。 もう一度聞きます。",
    startTimeMs: 151_640,
  },
  {
    endTimeMs: 169_800,
    script: "次はくりかえしてみましょう。 私はキャンプが好きです。",
    startTimeMs: 162_068,
  },
  {
    endTimeMs: 179_598,
    script: "自然の中で過ごすのが楽しいです。 キャンプ場に着いたらまずテントを立てます。",
    startTimeMs: 169_800,
  },
  {
    endTimeMs: 187_720,
    script: "暗くなるとランタンをつけます。 あたたかい光がきれいです。",
    startTimeMs: 179_598,
  },
  {
    endTimeMs: 195_239,
    script: "夜は寝袋で寝ます。 あたたかくて気持ちがいいです。",
    startTimeMs: 187_720,
  },
  {
    endTimeMs: 202_840,
    script: "外で料理をします。 焼いたお肉はとてもおいしいです。",
    startTimeMs: 195_239,
  },
  {
    endTimeMs: 213_239,
    script: "家族や友だちと食事をします。 会話も楽しいです。 キャンプで食べるカレーはとても",
    startTimeMs: 202_840,
  },
  {
    endTimeMs: 224_040,
    script: "人気があります。 夜は焚き火をします。 火を見ると落ち着きます。 花火を楽しみます。",
    startTimeMs: 213_239,
  },
  {
    endTimeMs: 234_054,
    script: "明るい光がとてもきれいです。 みんなで話したり歌ったりします。",
    startTimeMs: 224_040,
  },
  {
    endTimeMs: 242_239,
    script: "楽しい時間です。 静かな夜のキャンプ場もとてもすてきです。",
    startTimeMs: 234_054,
  },
  {
    endTimeMs: 250_319,
    script: "朝は森を散歩します。 空気が新鮮で気持ちいいです。",
    startTimeMs: 242_239,
  },
  {
    endTimeMs: 258_349,
    script: "湖の近くは静かです。 ゆっくり休むことができます。",
    startTimeMs: 250_319,
  },
  {
    endTimeMs: 270_199,
    script: "冬のキャンプも人気です。 雪の景色はとてもきれいです。 秋のキャンプも楽しいです。",
    startTimeMs: 258_349,
  },
  {
    endTimeMs: 277_800,
    script: "色づいた葉が見られます。 キャンプでは虫を見つけます。",
    startTimeMs: 270_199,
  },
  {
    endTimeMs: 285_720,
    script: "自然を近くに感じます。 川で遊ぶのも楽しいです。",
    startTimeMs: 277_800,
  },
  {
    endTimeMs: 293_000,
    script: "冷たい水が気持ちいいです。 釣りを楽しむ人もいます。",
    startTimeMs: 285_720,
  },
  {
    endTimeMs: 302_360,
    script: "魚が釣れるとうれしいです。 夜空には星が見えます。 キャンプの楽しみ",
    startTimeMs: 293_000,
  },
  {
    endTimeMs: 311_919,
    script: "の一つです。 キャンプの思い出はずっと心に残ります。 キャンプはとても楽しいです。",
    startTimeMs: 302_360,
  },
  {
    endTimeMs: 318_639,
    script: "ぜひ行ってみてください。",
    startTimeMs: 311_919,
  },
] as const satisfies readonly PrivateTranscriptSegment[];

const START_RESPONSE = {
  attempt_id: ATTEMPT_ID,
  attempt_number: 1,
  audio_url: "https://www.youtube.com/watch?v=PPw-mI8P4os",
  content_id: CONTENT_ID,
  segments: PRIVATE_TRANSCRIPT.map((segment, segmentIndex) => ({
    end_time_ms: segment.endTimeMs,
    segment_index: segmentIndex,
    start_time_ms: segment.startTimeMs,
  })),
  total_segments: PRIVATE_TRANSCRIPT.length,
} satisfies DictationStartResponse;

const CONTENT_DETAIL = {
  audio_url: "https://www.youtube.com/watch?v=PPw-mI8P4os",
  content_type: "shadowing_dictation",
  description:
    "In this video, you can practice everyday Japanese through a simple story about camping. The sentences are short, clear, and easy to follow, so this video is great for beginners and lower-intermediate learners.",
  difficulty: "N5",
  duration_seconds: 318.639,
  id: CONTENT_ID,
  prompts: PRIVATE_TRANSCRIPT.map((segment, segmentIndex) => ({
    blank_index: segmentIndex + 1,
    end_time_ms: segment.endTimeMs,
    prompt: `___ (${segmentIndex + 1})`,
    start_time_ms: segment.startTimeMs,
  })),
  published_at: null,
  title: "Camping | 5-minute Japanese Listening and Shadowing Practice",
  topic: "Life",
} satisfies DictationContentDetail;

function normalizeDictationText(text: string): string {
  return [...text]
    .filter((character) => !/\s/u.test(character) && character !== "。" && character !== "、")
    .join("");
}

export function getMockDictationContent(contentId: string): DictationContentDetail | undefined {
  return contentId === CONTENT_ID ? CONTENT_DETAIL : undefined;
}

export function startMockDictationAttempt(contentId: string): DictationStartResponse | undefined {
  if (contentId !== CONTENT_ID) {
    return undefined;
  }

  mockAttemptState.completedAt = undefined;
  mockAttemptState.results.clear();
  mockAttemptState.status = "in_progress";
  return START_RESPONSE;
}

export function checkMockDictationSegment(
  request: DictationPracticeRequest,
): DictationSegmentCheckResponse | undefined {
  if (request.attempt_id !== ATTEMPT_ID || mockAttemptState.status !== "in_progress") {
    return undefined;
  }

  const transcriptSegment = PRIVATE_TRANSCRIPT.at(request.segment_index);
  if (!transcriptSegment || request.segment_index < 0) {
    return undefined;
  }

  const result = {
    correct_script: transcriptSegment.script,
    is_correct:
      normalizeDictationText(request.user_answer) ===
      normalizeDictationText(transcriptSegment.script),
    is_last_segment: request.segment_index === PRIVATE_TRANSCRIPT.length - 1,
    segment_index: request.segment_index,
    user_answer: request.user_answer,
  };
  mockAttemptState.results.set(request.segment_index, result);
  return result;
}

export function completeMockDictationAttempt(
  attemptId: string,
): DictationCompleteResponse | undefined {
  if (attemptId !== ATTEMPT_ID || mockAttemptState.status !== "in_progress") {
    return undefined;
  }

  const correctCount = [...mockAttemptState.results.values()].filter(
    (result) => result.is_correct,
  ).length;
  const completedAt = new Date().toISOString();

  mockAttemptState.completedAt = completedAt;
  mockAttemptState.status = "completed";

  return {
    attempt_id: ATTEMPT_ID,
    completed_at: completedAt,
    correct_count: correctCount,
    earned_exp: MOCK_BASE_EXP,
    score: Number(((correctCount * 100) / PRIVATE_TRANSCRIPT.length).toFixed(2)),
    status: "completed",
    total_count: PRIVATE_TRANSCRIPT.length,
  };
}

export function getMockDictationAttemptReview(
  attemptId: string,
): DictationAttemptReviewResponse | undefined {
  if (attemptId !== ATTEMPT_ID) {
    return undefined;
  }

  const details =
    mockAttemptState.status === "completed"
      ? PRIVATE_TRANSCRIPT.map((segment, segmentIndex) => {
          const storedResult = mockAttemptState.results.get(segmentIndex);
          return {
            correct_script: storedResult?.correct_script ?? segment.script,
            is_correct: storedResult?.is_correct ?? false,
            segment_index: segmentIndex,
            user_answer: storedResult?.user_answer ?? "",
          };
        })
      : [...mockAttemptState.results.values()].sort(
          (firstResult, secondResult) => firstResult.segment_index - secondResult.segment_index,
        );

  return {
    attempt_id: ATTEMPT_ID,
    details,
    earned_exp: mockAttemptState.status === "completed" ? MOCK_BASE_EXP : 0,
    score:
      mockAttemptState.status === "completed"
        ? Number(
            (
              ([...mockAttemptState.results.values()].filter((result) => result.is_correct).length *
                100) /
              PRIVATE_TRANSCRIPT.length
            ).toFixed(2),
          )
        : null,
    status: mockAttemptState.status,
  };
}

export function getMockDictationInProgressAttempt(contentId: string):
  | {
      attempt: DictationStartResponse;
      checkedCount: number;
      results: Record<number, DictationSegmentCheckResponse>;
    }
  | undefined {
  if (contentId !== CONTENT_ID || mockAttemptState.status !== "in_progress") {
    return undefined;
  }

  return {
    attempt: START_RESPONSE,
    checkedCount: mockAttemptState.results.size,
    results: Object.fromEntries(mockAttemptState.results.entries()),
  };
}
