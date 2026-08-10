"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { type FieldError, useForm, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { submitAuthPreview } from "../../_utils/auth-preview-adapter";
import { registerSchema, type RegisterValues } from "../../_validations/auth-schemas";

export function RegisterForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<RegisterValues>({
    defaultValues: {
      confirmPassword: "",
      displayName: "",
      email: "",
      password: "",
    },
    resolver: zodResolver(registerSchema),
  });

  const handleRegister = async (values: RegisterValues) => {
    const nextResult = await submitAuthPreview("register", values);

    if (nextResult.kind === "error") {
      toast.error("We could not create your account", { description: nextResult.message });
      return;
    }

    toast.success("Account ready to continue", { description: nextResult.message });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(handleRegister)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="register-display-name">Display name</Label>
        <Input
          aria-describedby={errors.displayName ? "register-display-name-error" : undefined}
          aria-invalid={Boolean(errors.displayName)}
          autoComplete="name"
          id="register-display-name"
          placeholder="Your name"
          type="text"
          {...register("displayName")}
        />
        {errors.displayName?.message && (
          <p className="text-destructive text-sm" id="register-display-name-error">
            {errors.displayName.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-email">Email</Label>
        <Input
          aria-describedby={errors.email ? "register-email-error" : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          id="register-email"
          placeholder="you@example.com"
          type="email"
          {...register("email")}
        />
        {errors.email?.message && (
          <p className="text-destructive text-sm" id="register-email-error">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <PasswordField
          error={errors.password}
          id="register-password"
          isVisible={isPasswordVisible}
          label="Password"
          onToggle={() => setIsPasswordVisible((current) => !current)}
          registration={register("password")}
        />
        <PasswordField
          error={errors.confirmPassword}
          id="register-confirm-password"
          isVisible={isConfirmPasswordVisible}
          label="Confirm password"
          onToggle={() => setIsConfirmPasswordVisible((current) => !current)}
          registration={register("confirmPassword")}
        />
      </div>

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

function PasswordField({
  error,
  id,
  isVisible,
  label,
  onToggle,
  registration,
}: {
  error?: FieldError;
  id: string;
  isVisible: boolean;
  label: string;
  onToggle: () => void;
  registration: UseFormRegisterReturn;
}) {
  const errorId = `${id}-error`;
  const errorMessage = error?.message;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          aria-describedby={errorMessage ? errorId : undefined}
          aria-invalid={Boolean(errorMessage)}
          autoComplete="new-password"
          className="pr-12"
          id={id}
          type={isVisible ? "text" : "password"}
          {...registration}
        />
        <button
          aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-base focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onToggle}
          type="button"
        >
          {isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      {errorMessage && (
        <p className="text-destructive text-sm" id={errorId}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
