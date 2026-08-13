"use client";

import { BookOpenCheck, Headphones, PencilLine } from "lucide-react";

import {
  PracticeMethodGuide,
  type PracticeMethodGuideStep,
} from "@/components/common/practice-catalog/practice-method-guide";

const dictationSteps = [
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
    title: "Complete the blanks",
  },
  {
    description: "Compare each answer with the transcript and notice the details you missed.",
    icon: BookOpenCheck,
    number: "03",
    title: "Check and learn",
  },
] satisfies PracticeMethodGuideStep[];

export function DictationMethodGuide() {
  return (
    <PracticeMethodGuide
      heading="How Dictation works"
      headingId="dictation-method-heading"
      icon={Headphones}
      steps={dictationSteps}
      summary="Review the three-step listening loop."
    />
  );
}
