import { z } from "zod";

export const shadowingLessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  audio_url: z.string(),
  audio_duration_ms: z.number(),
  transcript_ja: z.string(),
  available_modes: z.array(z.string()).refine((modes) => modes.includes("shadowing"), {
    message: "Lesson must include shadowing in available_modes",
  }),
});

export type ShadowingLesson = z.infer<typeof shadowingLessonSchema>;

export const shadowingResultSchema = z.object({
  attempt_id: z.string(),
  practice_mode: z.literal("shadowing"),
  status: z.literal("completed"),
  exp_earned: z.number(),
});

export type ShadowingResult = z.infer<typeof shadowingResultSchema>;
