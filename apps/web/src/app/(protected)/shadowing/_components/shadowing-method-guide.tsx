"use client";

import { AudioLines, Headphones, Mic2 } from "lucide-react";

import {
  PracticeMethodGuide,
  type PracticeMethodGuideStep,
} from "@/components/common/practice-catalog/practice-method-guide";

const shadowingSteps = [
  {
    description: "Hear the speaker’s words, pacing, and natural rhythm.",
    icon: Headphones,
    number: "01",
    title: "Listen closely",
  },
  {
    description: "Follow the original audio and speak each phrase aloud.",
    icon: Mic2,
    number: "02",
    title: "Shadow aloud",
  },
  {
    description: "Replay both tracks and notice what you can improve.",
    icon: AudioLines,
    number: "03",
    title: "Compare and improve",
  },
] satisfies PracticeMethodGuideStep[];

export function ShadowingMethodGuide() {
  return (
    <PracticeMethodGuide
      heading="How Dual Shadowing works"
      headingId="shadowing-method-heading"
      icon={Headphones}
      steps={shadowingSteps}
      summary="Review the three-step practice loop."
    />
  );
}
