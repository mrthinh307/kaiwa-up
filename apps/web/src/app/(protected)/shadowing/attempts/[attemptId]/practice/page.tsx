import type { Metadata } from "next";

import { ShadowingPracticeRoute } from "../../../_components/shadowing-practice-route";

export const metadata: Metadata = {
  description: "Practice a saved Japanese Shadowing attempt.",
  title: "Shadowing Practice | KaiwaUp",
};

export default async function ShadowingAttemptPracticePage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return (
    <main className="px-4 py-6 sm:px-8 sm:py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1300px]">
        <ShadowingPracticeRoute attemptId={attemptId} />
      </div>
    </main>
  );
}
