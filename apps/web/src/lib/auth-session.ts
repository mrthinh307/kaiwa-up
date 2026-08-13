import { clearAccessToken, setAccessToken } from "@/lib/access-token";
import { refresh } from "@/lib/api-client";

type ApiResultLike = {
  response?: Response;
};

export type RefreshOutcome = "success" | "unauthorized" | "unavailable";

let refreshPromise: Promise<RefreshOutcome> | null = null;

async function requestNewAccessToken(): Promise<RefreshOutcome> {
  const result = await refresh();

  if (result.data) {
    setAccessToken(result.data.access_token);
    return "success";
  }

  if (result.response?.status === 401) {
    clearAccessToken();
    return "unauthorized";
  }

  return "unavailable";
}

export function refreshAccessToken(): Promise<RefreshOutcome> {
  if (!refreshPromise) {
    refreshPromise = requestNewAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function requestWithAccessTokenRetry<TResult extends ApiResultLike>(
  request: () => Promise<TResult>,
  onRefreshUnauthorized: () => void,
): Promise<TResult> {
  const firstResult = await request();

  if (firstResult.response?.status !== 401) {
    return firstResult;
  }

  const refreshOutcome = await refreshAccessToken();

  if (refreshOutcome === "success") {
    return request();
  }

  if (refreshOutcome === "unauthorized") {
    onRefreshUnauthorized();
  }

  return firstResult;
}
