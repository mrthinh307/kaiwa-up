"use client";

const inFlightGetRequests = new Map<string, Promise<Response>>();

function getRequestKey(request: Request): string {
  const headers = [...request.headers.entries()].sort(([left], [right]) =>
    left.localeCompare(right, "en"),
  );

  return JSON.stringify([
    request.method,
    request.url,
    request.credentials,
    request.cache,
    request.redirect,
    headers,
  ]);
}

/**
 * Shares an in-flight GET response between identical callers.
 *
 * React Strict Mode replays mount effects in development. Components should remain
 * safe to remount, while this transport boundary prevents the replay from sending
 * the same read request over the network twice. Mutations always pass through.
 */
export const singleFlightFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);

  if (request.method !== "GET") {
    return globalThis.fetch(request);
  }

  const requestKey = getRequestKey(request);
  let responsePromise = inFlightGetRequests.get(requestKey);

  if (!responsePromise) {
    responsePromise = globalThis.fetch(request);
    inFlightGetRequests.set(requestKey, responsePromise);

    const clearRequest = () => {
      if (inFlightGetRequests.get(requestKey) === responsePromise) {
        inFlightGetRequests.delete(requestKey);
      }
    };
    void responsePromise.then(clearRequest, clearRequest);
  }

  return responsePromise.then((response) => response.clone());
};
