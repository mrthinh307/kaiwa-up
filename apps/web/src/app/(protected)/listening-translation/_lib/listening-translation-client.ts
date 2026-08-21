"use client";

import { client } from "@/lib/api-client";

export type TranslationCompletionViewModel = {
  attemptId: string;
  expEarned: number;
  status: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseTranslationCompletion(value: unknown): TranslationCompletionViewModel | null {
  if (!isRecord(value)) {
    return null;
  }

  const attemptId = value.attempt_id;
  const expEarned = value.exp_earned;
  const status = value.status;

  if (
    typeof attemptId !== "string" ||
    typeof expEarned !== "number" ||
    !Number.isFinite(expEarned) ||
    typeof status !== "string"
  ) {
    return null;
  }

  return { attemptId, expEarned, status };
}

export function requestTranslationSubmission(lessonId: string, translationVi: string) {
  // TODO(#95): Replace this request with the generated submit function when its OpenAPI lands.
  return client.post({
    body: { translation_vi: translationVi },
    headers: { "Content-Type": "application/json" },
    security: [{ scheme: "bearer", type: "http" }],
    url: `/api/v1/listening-translation/lessons/${encodeURIComponent(lessonId)}/submit`,
  });
}
