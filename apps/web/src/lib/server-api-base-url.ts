import "server-only";

export function getServerApiBaseUrl(): string {
  const baseUrl =
    process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  return baseUrl.replace(/\/$/, "");
}
