"use client";

import { PracticeMethodGuide } from "@/components/common/practice-catalog/practice-method-guide";

const REFLEX_GUIDE_STEPS = [
  {
    description: "Listen to a native Japanese conversational prompt without seeing any transcript.",
    iconName: "headphones",
    number: "01",
    title: "Hear the scenario",
  },
  {
    description: "Formulate your response and speak naturally before the 3-second timer expires.",
    iconName: "mic",
    number: "02",
    title: "Speak within 3s",
  },
  {
    description: "Receive instant AI analysis on response speed, grammar, fluency, and accuracy.",
    iconName: "book",
    number: "03",
    title: "Get instant AI score",
  },
] as const;

export function ReflexMethodGuide() {
  return (
    <PracticeMethodGuide
      defaultOpen={false}
      heading="How 3-Second Reflex Works"
      headingId="reflex-method-guide-heading"
      iconName="headphones"
      steps={REFLEX_GUIDE_STEPS}
      summary="Train your real-time conversational instincts by responding under time pressure with instant AI feedback."
    />
  );
}
