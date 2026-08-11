"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { submitAuthPreview } from "../../_utils/auth-preview-adapter";
import { loginSchema, type LoginValues } from "../../_validations/auth-schemas";

export function LoginForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(loginSchema),
  });

  const handleLogin = async (values: LoginValues) => {
    const nextResult = await submitAuthPreview("login", values);

    if (nextResult.kind === "error") {
      toast.error("We could not log you in", { description: nextResult.message });
      return;
    }

    toast.success("Preview complete", { description: nextResult.message });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(handleLogin)} noValidate>
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

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
