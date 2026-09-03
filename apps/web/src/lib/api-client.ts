"use client";

import { client, healthCheck } from "@kaiwa-app/api-client";

import { getAccessToken } from "@/lib/access-token";
import { getBrowserApiBaseUrl } from "@/lib/api-base-url";
import { singleFlightFetch } from "@/lib/single-flight-fetch";

client.setConfig({
  auth: () => getAccessToken(),
  baseUrl: getBrowserApiBaseUrl(),
  credentials: "include",
  fetch: singleFlightFetch,
});

export async function checkSystemHealth() {
  const response = await healthCheck();
  return response.data;
}

export { client };
export * from "@kaiwa-app/api-client";
