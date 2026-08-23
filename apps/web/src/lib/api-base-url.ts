export function getBrowserApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "");
  }

  return process.env.NODE_ENV === "production" ? "" : "http://localhost:8000";
}
