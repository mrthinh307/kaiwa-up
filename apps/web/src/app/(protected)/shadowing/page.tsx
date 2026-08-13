import type { Metadata } from "next";

import { ShadowingScreen } from "./_components/shadowing-screen";
import { mockShadowingLesson } from "./_utils/shadowing-mock-adapter";

export const metadata: Metadata = {
  description:
    "Practice Japanese listening and speaking reflexes with dual audio shadowing and self-comparison.",
  title: "Shadowing Practice | KaiwaUp",
};

export default function ShadowingPage() {
  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1000px]">
        <ShadowingScreen lesson={mockShadowingLesson} />
      </div>
    </main>
  );
}
