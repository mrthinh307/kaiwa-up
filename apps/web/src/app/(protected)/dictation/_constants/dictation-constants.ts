export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export const DICTATION_STEPS = [
  {
    description: "Replay only the active timestamp until the sentence becomes clear.",
    iconName: "headphones",
    number: "01",
    title: "Listen to one segment",
  },
  {
    description: "Write the complete Japanese sentence you hear, not isolated missing words.",
    iconName: "pencil",
    number: "02",
    title: "Type the sentence",
  },
  {
    description: "Check the segment to reveal its transcript, then retry or continue.",
    iconName: "book",
    number: "03",
    title: "Check and review",
  },
] as const;
