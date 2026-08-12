import { client, healthCheck } from "@kaiwa-app/api-client";

client.setConfig({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
});

export async function checkSystemHealth() {
  const response = await healthCheck();
  return response.data;
}

export { client };
export * from "@kaiwa-app/api-client";
