import type { PracticeMethodGuideStep } from "@/components/common/practice-catalog/practice-method-guide";

export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export const SHADOWING_STEPS: readonly PracticeMethodGuideStep[] = [
  {
    description:
      "Listen to the native Japanese speaker and read the synchronized transcript segment.",
    iconName: "headphones",
    number: "01",
    title: "Listen and read",
  },
  {
    description: "Shadow the speaker by speaking out loud and recording your voice.",
    iconName: "mic",
    number: "02",
    title: "Shadow and record",
  },
  {
    description:
      "Listen back to your recording and compare your pronunciation, rhythm, and pitch accent.",
    iconName: "book",
    number: "03",
    title: "Self-comparison",
  },
] as const;
