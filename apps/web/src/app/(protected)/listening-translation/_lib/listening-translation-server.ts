import type { LearningContentDetail, LearningContentItem } from "@kaiwa-app/api-client";

import { client, getLearningContent, listLearningContents } from "@kaiwa-app/api-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const CATALOG_PAGE_SIZE = 20;

function configureServerClient(): void {
  client.setConfig({ baseUrl: API_BASE_URL });
}

export async function listListeningTranslationLessons(): Promise<LearningContentItem[]> {
  // TODO(#95): Use the generated Listening Translation catalog function when its OpenAPI lands.
  configureServerClient();
  const result = await listLearningContents({
    query: { page: 1, page_size: CATALOG_PAGE_SIZE, type: "listening_translation" },
  });

  if (!result.data) {
    throw new Error(
      `Listening Translation catalog request failed with status ${result.response?.status ?? "unknown"}`,
    );
  }

  return result.data.items;
}

export async function getListeningTranslationLesson(
  lessonId: string,
): Promise<LearningContentDetail | null> {
  // TODO(#95): Use the generated Listening Translation detail function when its OpenAPI lands.
  configureServerClient();
  const result = await getLearningContent({ path: { content_id: lessonId } });

  if (result.response?.status === 404) {
    return null;
  }

  if (!result.data) {
    throw new Error(
      `Listening Translation lesson request failed with status ${result.response?.status ?? "unknown"}`,
    );
  }

  return result.data;
}
