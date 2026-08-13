"use client";

import { client, healthCheck } from "@kaiwa-app/api-client";

import { getAccessToken } from "@/lib/access-token";

client.setConfig({
  auth: () => getAccessToken(),
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  credentials: "include",
});

export async function checkSystemHealth() {
  const response = await healthCheck();
  return response.data;
}

export { client };
export * from "@kaiwa-app/api-client";
