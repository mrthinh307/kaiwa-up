import type { LoginValues, RegisterValues } from "../_validations/auth-schemas";

export type AuthPreviewErrorCode =
  "conflict" | "service_unavailable" | "unauthorized" | "validation_error";

export type AuthPreviewResult =
  | { kind: "success"; message: string }
  | { code: AuthPreviewErrorCode; kind: "error"; message: string };

type AuthPreviewValues = LoginValues | RegisterValues;

export function submitAuthPreview(mode: "login" | "register", values: AuthPreviewValues) {
  return new Promise<AuthPreviewResult>((resolve) => {
    window.setTimeout(() => {
      if (values.email === "service@example.com") {
        resolve({
          code: "service_unavailable",
          kind: "error",
          message: "The authentication service is unavailable. Try again shortly.",
        });
        return;
      }

      if (mode === "login" && values.email === "unauthorized@example.com") {
        resolve({
          code: "unauthorized",
          kind: "error",
          message: "Email or password is incorrect.",
        });
        return;
      }

      if (mode === "register" && values.email === "taken@example.com") {
        resolve({
          code: "conflict",
          kind: "error",
          message: "This email is already in use. Try logging in instead.",
        });
        return;
      }

      resolve({
        kind: "success",
        message:
          mode === "register"
            ? "Preview complete. The next step will be to sign in."
            : "Preview complete. Session integration will be connected later.",
      });
    }, 450);
  });
}
