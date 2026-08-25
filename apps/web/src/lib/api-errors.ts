import type { ErrorResponse, ValidationErrorDetail } from "@kaiwa-app/api-client";

export type ApiFailure = {
  code: string | undefined;
  fieldErrors: ValidationErrorDetail[];
  message: string;
  status: number | undefined;
};

type ApiErrorResult = {
  error?: unknown;
  response?: Response;
};

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (!value || typeof value !== "object" || !("error" in value)) {
    return false;
  }

  const error = value.error;
  return (
    error !== null &&
    error !== undefined &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

function isValidationErrorDetail(value: unknown): value is ValidationErrorDetail {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "field" in value &&
    typeof value.field === "string" &&
    "message" in value &&
    typeof value.message === "string" &&
    "type" in value &&
    typeof value.type === "string"
  );
}

export function parseApiFailure(result: ApiErrorResult): ApiFailure {
  if (isErrorResponse(result.error)) {
    const details = result.error.error.details;

    return {
      code: result.error.error.code,
      fieldErrors: Array.isArray(details) ? details.filter(isValidationErrorDetail) : [],
      message: result.error.error.message,
      status: result.response?.status ?? result.error.error.status,
    };
  }

  return {
    code: undefined,
    fieldErrors: [],
    message: result.response
      ? "The service could not complete this request. Please try again."
      : "We could not reach the service. Check your connection and try again.",
    status: result.response?.status,
  };
}

export function normalizeApiFieldName(field: string): string {
  const name = field.split(".").at(-1) ?? field;

  if (name === "name" || name === "display_name") {
    return "displayName";
  }

  return name;
}
