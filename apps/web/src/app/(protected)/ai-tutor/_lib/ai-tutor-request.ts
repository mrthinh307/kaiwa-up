import { parseApiFailure, type ApiFailure } from "@/lib/api-errors";

const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_BACKOFF_MS = 750;
const DEFAULT_MAX_BACKOFF_MS = 4000;
const MAX_RETRY_AFTER_MS = 30000;
const JITTER_RATIO = 0.2;

type ApiResult = {
  data?: unknown;
  error?: unknown;
  response?: Response;
};

export type TutorFailureKind = "cancelled" | "manual_retryable" | "terminal" | "transient";

export type TutorRetryScheduled = {
  attempt: number;
  delayMs: number;
  failure: ApiFailure;
  maxAttempts: number;
};

export type TutorRequestOptions = {
  isSuccessful?: (result: ApiResult) => boolean;
  maxBackoffMs?: number;
  maxRetries?: number;
  onRetryScheduled?: (info: TutorRetryScheduled) => void;
  retryBackoffMs?: number;
  signal?: AbortSignal;
};

export class TutorRequestError extends Error {
  readonly attempts: number;
  readonly failure: ApiFailure;
  readonly isRetryExhausted: boolean;
  readonly kind: TutorFailureKind;

  constructor({
    attempts,
    failure,
    isRetryExhausted,
    kind,
  }: {
    attempts: number;
    failure: ApiFailure;
    isRetryExhausted: boolean;
    kind: TutorFailureKind;
  }) {
    super(failure.message);
    this.name = "TutorRequestError";
    this.attempts = attempts;
    this.failure = failure;
    this.isRetryExhausted = isRetryExhausted;
    this.kind = kind;
  }
}

export function isTutorRequestError(error: unknown): error is TutorRequestError {
  return error instanceof TutorRequestError;
}

export function classifyTutorFailure(failure: ApiFailure): TutorFailureKind {
  if (failure.code === "tutor_response_pending") {
    return "manual_retryable";
  }

  if (
    failure.status === undefined ||
    failure.status === 408 ||
    failure.status === 429 ||
    (failure.status >= 500 && failure.status <= 599)
  ) {
    return "transient";
  }

  return "terminal";
}

export async function executeTutorRequest<TResult extends ApiResult>(
  request: () => Promise<TResult>,
  options: TutorRequestOptions = {},
): Promise<TResult> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const maxAttempts = maxRetries + 1;
  const retryBackoffMs = options.retryBackoffMs ?? DEFAULT_BACKOFF_MS;
  const maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts += 1;

    try {
      if (options.signal?.aborted) {
        throw createCancelledRequestError(attempts);
      }

      const result = await request();
      if ((result.data !== undefined && result.data !== null) || options.isSuccessful?.(result)) {
        return result;
      }

      const failure = parseFailure(result);
      const kind = classifyTutorFailure(failure);
      if (kind === "transient" && attempts < maxAttempts) {
        await scheduleRetry({
          attempt: attempts,
          failure,
          maxAttempts,
          options,
          response: result.response,
          retryBackoffMs,
          maxBackoffMs,
          signal: options.signal,
        });
        continue;
      }

      throw new TutorRequestError({
        attempts,
        failure,
        isRetryExhausted: kind === "transient",
        kind,
      });
    } catch (error) {
      if (options.signal?.aborted || isAbortError(error)) {
        throw createCancelledRequestError(attempts);
      }

      if (isTutorRequestError(error)) {
        throw error;
      }

      const failure = parseFailure({ error });
      const kind = classifyTutorFailure(failure);
      if (kind === "transient" && attempts < maxAttempts) {
        await scheduleRetry({
          attempt: attempts,
          failure,
          maxAttempts,
          options,
          retryBackoffMs,
          maxBackoffMs,
          signal: options.signal,
        });
        continue;
      }

      throw new TutorRequestError({
        attempts,
        failure,
        isRetryExhausted: kind === "transient",
        kind,
      });
    }
  }

  throw new TutorRequestError({
    attempts,
    failure: {
      code: undefined,
      fieldErrors: [],
      message: "The service could not complete this request. Please try again.",
      status: undefined,
    },
    isRetryExhausted: true,
    kind: "transient",
  });
}

async function scheduleRetry({
  attempt,
  failure,
  maxAttempts,
  options,
  response,
  retryBackoffMs,
  maxBackoffMs,
  signal,
}: {
  attempt: number;
  failure: ApiFailure;
  maxAttempts: number;
  options: TutorRequestOptions;
  response?: Response;
  retryBackoffMs: number;
  maxBackoffMs: number;
  signal?: AbortSignal;
}): Promise<void> {
  const exponentialDelay = Math.min(maxBackoffMs, retryBackoffMs * 2 ** (attempt - 1));
  const retryAfterDelay = parseRetryAfter(response);
  const baseDelay = Math.min(MAX_RETRY_AFTER_MS, Math.max(exponentialDelay, retryAfterDelay ?? 0));
  const jitteredDelay = Math.round(
    baseDelay * (1 - JITTER_RATIO + Math.random() * JITTER_RATIO * 2),
  );

  if (signal?.aborted) {
    throw createCancelledRequestError(attempt);
  }

  options.onRetryScheduled?.({
    attempt,
    delayMs: jitteredDelay,
    failure,
    maxAttempts,
  });
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, jitteredDelay);
    const handleAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Tutor request was cancelled", "AbortError"));
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

function createCancelledRequestError(attempts: number): TutorRequestError {
  return new TutorRequestError({
    attempts,
    failure: {
      code: "request_cancelled",
      fieldErrors: [],
      message: "The request was cancelled.",
      status: undefined,
    },
    isRetryExhausted: false,
    kind: "cancelled",
  });
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
  );
}

function parseFailure(result: ApiResult): ApiFailure {
  if ("response" in result || "error" in result) {
    return parseApiFailure(result);
  }

  return {
    code: undefined,
    fieldErrors: [],
    message: "We could not reach the service. Check your connection and try again.",
    status: undefined,
  };
}

function parseRetryAfter(response?: Response): number | undefined {
  const value = response?.headers.get("Retry-After");
  if (!value) {
    return undefined;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(MAX_RETRY_AFTER_MS, seconds * 1000);
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return Math.min(MAX_RETRY_AFTER_MS, Math.max(0, timestamp - Date.now()));
}
