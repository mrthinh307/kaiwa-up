import type { Metadata } from "next";

import { DictationPracticeRoute } from "../../../_components/dictation-practice-route";

export const metadata: Metadata = {
  description: "Practice a saved Japanese Dictation attempt one segment at a time.",
  title: "Dictation Practice | KaiwaUp",
};

export default async function DictationAttemptPracticePage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <DictationPracticeRoute attemptId={attemptId} />;
}
