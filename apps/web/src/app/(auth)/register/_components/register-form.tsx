"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type FieldError, useForm, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register as registerRequest } from "@/lib/api-client";
import { normalizeApiFieldName, parseApiFailure } from "@/lib/api-errors";

import { registerSchema, type RegisterValues } from "../../_validations/auth-schemas";

export function RegisterForm() {
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
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
    const result = await registerRequest({
      body: {
        email: values.email,
        name: values.displayName,
        password: values.password,
      },
    });

    if (!result.data) {
      const failure = parseApiFailure(result);

      if (failure.status === 409) {
        setError("email", { message: "This email is already in use." });
      } else {
        let hasMappedField = false;
        for (const fieldError of failure.fieldErrors) {
          const field = normalizeApiFieldName(fieldError.field);
          if (field === "displayName" || field === "email" || field === "password") {
            setError(field, { message: fieldError.message });
            hasMappedField = true;
          }
        }

        if (!hasMappedField) {
          setError("root.server", { message: failure.message });
        }
      }

      toast.error("We could not create your account", { description: failure.message });
      return;
    }

    router.replace("/login?registered=1");
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

      {errors.root?.server?.message && (
        <p className="text-sm text-destructive" role="alert">
          {errors.root.server.message}
        </p>
      )}

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
