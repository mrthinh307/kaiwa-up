import { BookOpenCheck, Headphones, PencilLine } from "lucide-react";

export const DICTATION_EXERCISE_TYPES = ["one_word", "multiple_words", "full_sentence"] as const;

export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export const CIRCLED_BLANK_NUMBERS = [
  "①",
  "②",
  "③",
  "④",
  "⑤",
  "⑥",
  "⑦",
  "⑧",
  "⑨",
  "⑩",
  "⑪",
  "⑫",
  "⑬",
  "⑭",
  "⑮",
  "⑯",
  "⑰",
  "⑱",
  "⑲",
  "⑳",
] as const;

export const DICTATION_STEPS = [
  {
    description: "Hear the full sentence first, then replay the parts around each blank.",
    icon: Headphones,
    number: "01",
    title: "Listen closely",
  },
  {
    description: "Type the missing Japanese and revise every answer before submitting.",
    icon: PencilLine,
    number: "02",
    title: "Complete blanks",
  },
  {
    description: "Compare each answer with the transcript and notice the details you missed.",
    icon: BookOpenCheck,
    number: "03",
    title: "Check and learn",
  },
] as const;
