"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { normalizeApiFieldName, parseApiFailure } from "@/lib/api-errors";
import { getSafeInternalPath } from "@/lib/safe-redirect";

import { loginSchema, type LoginValues } from "../../_validations/auth-schemas";

type LoginFormProps = {
  isRegistered: boolean;
  nextPath: string | undefined;
};

export function LoginForm({ isRegistered, nextPath }: LoginFormProps) {
  const auth = useAuth();
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(loginSchema),
  });

  const handleLogin = async (values: LoginValues) => {
    const result = await auth.login(values);

    if (result.kind === "error") {
      const failure = parseApiFailure(result);

      if (failure.status === 401) {
        setError("root.server", { message: "Email or password is incorrect." });
      } else {
        for (const fieldError of failure.fieldErrors) {
          const field = normalizeApiFieldName(fieldError.field);
          if (field === "email" || field === "password") {
            setError(field, { message: fieldError.message });
          }
        }
      }

      if (failure.fieldErrors.length === 0 && failure.status !== 401) {
        setError("root.server", { message: failure.message });
      }

      toast.error("We could not log you in", { description: failure.message });
      return;
    }

    router.replace(getSafeInternalPath(nextPath));
    router.refresh();
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(handleLogin)} noValidate>
      {isRegistered && (
        <div
          className="flex gap-3 rounded-base border-2 border-border bg-main p-3 text-sm text-main-foreground"
          role="status"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p>Your account is ready. Log in to continue.</p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          aria-describedby={errors.email ? "login-email-error" : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          id="login-email"
          placeholder="you@example.com"
          type="email"
          {...register("email")}
        />
        {errors.email?.message && (
          <p className="text-destructive text-sm" id="login-email-error">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Input
            aria-describedby={errors.password ? "login-password-error" : undefined}
            aria-invalid={Boolean(errors.password)}
            autoComplete="current-password"
            className="pr-12"
            id="login-password"
            type={isPasswordVisible ? "text" : "password"}
            {...register("password")}
          />
          <button
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-base focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setIsPasswordVisible((current) => !current)}
            type="button"
          >
            {isPasswordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
        {errors.password?.message && (
          <p className="text-destructive text-sm" id="login-password-error">
            {errors.password.message}
          </p>
        )}
      </div>

      {errors.root?.server?.message && (
        <p className="text-sm text-destructive" role="alert">
          {errors.root.server.message}
        </p>
      )}

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
