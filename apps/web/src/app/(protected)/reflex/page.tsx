import type { Metadata } from "next";

import { Zap } from "lucide-react";

import { ProtectedPageHeader } from "@/components/common/protected-route/protected-page-header";

import { ReflexCatalog } from "./_components/reflex-catalog";

export const metadata: Metadata = {
  description:
    "Train rapid Japanese speaking reflexes with 3-second prompts and real-time AI evaluation.",
  title: "3-Second Reflex | KaiwaUp",
};

export default function ReflexPage() {
  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1300px]">
        <ProtectedPageHeader
          description="Listen to the question, respond within three seconds, and receive AI feedback to build natural speaking instincts."
          eyebrow="Reflex practice"
          icon={Zap}
          title="3-Second Reflex"
        />
        <div className="mt-10">
          <ReflexCatalog />
        </div>
      </div>
    </main>
  );
}
