import type { Metadata } from "next";

import { Languages } from "lucide-react";

import { ProtectedPageHeader } from "@/components/common/protected-route/protected-page-header";

import { ListeningTranslationCatalog } from "./_components/listening-translation-catalog";
import { listListeningTranslationLessons } from "./_lib/listening-translation-server";

export const metadata: Metadata = {
  description: "Listen to Japanese and translate its meaning into Vietnamese with AI feedback.",
  title: "Listening & Translation | KaiwaUp",
};

export default async function ListeningTranslationPage() {
  const lessons = await listListeningTranslationLessons();

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1200px]">
        <ProtectedPageHeader
          description="Listen for meaning, write a natural Vietnamese translation, and receive semantic feedback from AI."
          eyebrow="Listening practice"
          icon={Languages}
          title="Listening & Translation"
        />

        <div className="mt-10">
          <ListeningTranslationCatalog lessons={lessons} />
        </div>
      </div>
    </main>
  );
}
