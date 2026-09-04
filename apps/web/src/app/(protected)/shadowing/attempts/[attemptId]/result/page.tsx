import type { Metadata } from "next";

import { ShadowingResultRoute } from "../../../_components/shadowing-result-route";

export const metadata: Metadata = {
  description: "Review a completed Japanese Shadowing attempt.",
  title: "Shadowing Result | KaiwaUp",
};

export default async function ShadowingAttemptResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return (
    <main className="px-4 py-6 sm:px-8 sm:py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1300px]">
        <ShadowingResultRoute attemptId={attemptId} />
      </div>
    </main>
  );
}
