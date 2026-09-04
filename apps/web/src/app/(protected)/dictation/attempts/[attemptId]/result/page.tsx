import type { Metadata } from "next";

import { DictationResultRoute } from "../../../_components/dictation-result-route";

export const metadata: Metadata = {
  description: "Review a completed Japanese Dictation attempt.",
  title: "Dictation Result | KaiwaUp",
};

export default async function DictationAttemptResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return (
    <main className="px-4 py-6 sm:px-8 sm:py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1300px]">
        <DictationResultRoute attemptId={attemptId} />
      </div>
    </main>
  );
}
