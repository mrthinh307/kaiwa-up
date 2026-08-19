import type { ShadowingLesson, ShadowingResult } from "../_validations/shadowing-schemas";

export const mockShadowingLesson: ShadowingLesson = {
  audio_url: "https://res.cloudinary.com/kaiwaup/audio/shopping.mp3",
  content_type: "shadowing_dictation",
  description: "Practice Japanese shopping dialogue.",
  difficulty: "N4",
  duration_seconds: 30,
  id: "01912345-6789-7abc-def0-123456789abc",
  title: "Hội thoại mua sắm (Shopping Conversation)",
  topic: "Shopping",
  transcript: [
    {
      end_time_ms: 5000,
      script: "いらっしゃいませ。何をお探しですか？",
      start_time_ms: 0,
    },
  ],
};

export function getMockShadowingResult(): ShadowingResult {
  return {
    attempt_id: `mock-attempt-${Date.now()}`,
    duration_seconds: 15,
    exp_earned: 50,
    practice_mode: "shadowing",
    status: "completed",
  };
}
