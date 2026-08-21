"use client";

import type { ReactNode } from "react";

import { useSelectedLayoutSegment } from "next/navigation";

import { AiTutorContent } from "./ai-tutor-content";

export function AiTutorLayoutContent({ children }: { children: ReactNode }) {
  const conversationId = useSelectedLayoutSegment();

  return (
    <>
      <AiTutorContent conversationId={conversationId} />
      {children}
    </>
  );
}
