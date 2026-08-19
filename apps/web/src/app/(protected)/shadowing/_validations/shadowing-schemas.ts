import type { ShadowingContentDetail, TranscriptSegment } from "@kaiwa-app/api-client";

export type ShadowingLesson = ShadowingContentDetail;

export type ShadowingTranscriptSegment = TranscriptSegment;

export type ShadowingResult = {
  attempt_id: string;
  duration_seconds: number;
  exp_earned: number;
  practice_mode: "shadowing";
  recording_id?: string;
  status: "completed";
};
