import type { Metadata } from "next";

import Link from "next/link";

import { AuthFormCard } from "../_components/auth-form-card";
import { AuthPageShell } from "../_components/auth-page-shell";
import { GoogleAuthButton } from "../_components/google-auth-button";
import { RegisterForm } from "./_components/register-form";

export const metadata: Metadata = {
  title: "Create an account | KaiwaUp",
  description: "Create your KaiwaUp account and start practicing Japanese listening and speaking.",
};

export default function RegisterPage() {
  return (
    <AuthPageShell
      description="Build a consistent practice habit and turn the Japanese you know into responses you can use."
      eyebrow="START PRACTICING"
      japaneseLine="会話の一歩を始めよう。"
      japaneseTranslation="Take the first step toward real conversation."
      title="Make your next conversation easier."
    >
      <AuthFormCard
        description="Create an account and start building your Japanese conversation reflexes."
        footer={
          <p className="w-full text-center text-sm">
            Already have an account?{" "}
            <Link className="font-heading underline underline-offset-4" href="/login">
              Log in
            </Link>
          </p>
        }
        title="Create your account"
      >
        <div className="space-y-6">
          <GoogleAuthButton />
          <div className="flex items-center gap-3 text-xs font-heading uppercase tracking-[0.12em] text-foreground/60">
            <span className="h-0.5 flex-1 bg-border" />
            <span>or use email</span>
            <span className="h-0.5 flex-1 bg-border" />
          </div>
          <RegisterForm />
        </div>
      </AuthFormCard>
    </AuthPageShell>
  );
}
