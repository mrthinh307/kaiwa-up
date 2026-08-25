import "server-only";

import type { DictationContentDetail } from "@kaiwa-app/api-client";

import { client, getDictationContent } from "@kaiwa-app/api-client";
import { cache } from "react";

import { getServerApiBaseUrl } from "@/lib/server-api-base-url";

client.setConfig({
  baseUrl: getServerApiBaseUrl(),
});

export const getDictationContentFromApi = cache(
  async (contentId: string): Promise<DictationContentDetail | null> => {
    const result = await getDictationContent({ path: { content_id: contentId } });

    if (result.data) {
      return result.data.content_type === "shadowing_dictation" ? result.data : null;
    }

    if (result.response?.status === 404 || result.response?.status === 422) {
      return null;
    }

    throw new Error("The Dictation lesson service is unavailable.");
  },
);
