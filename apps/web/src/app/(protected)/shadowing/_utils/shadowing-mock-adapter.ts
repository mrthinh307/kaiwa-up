import type { ShadowingLesson, ShadowingResult } from "../_validations/shadowing-schemas";

export const mockShadowingLesson: ShadowingLesson = {
  id: "lesson-01",
  title: "Hội thoại mua sắm (Shopping Conversation)",
  audio_url: "https://res.cloudinary.com/kaiwaup/audio/shopping.mp3",
  audio_duration_ms: 30000,
  transcript_ja: "いらっしゃいませ。何をお探しですか？",
  available_modes: ["shadowing", "dictation"],
};

export function getMockShadowingResult(): ShadowingResult {
  return {
    attempt_id: `mock-attempt-${Date.now()}`,
    practice_mode: "shadowing",
    status: "completed",
    exp_earned: 15,
  };
}
