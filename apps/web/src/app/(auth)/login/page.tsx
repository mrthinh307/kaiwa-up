import type { Metadata } from "next";

import Link from "next/link";

import { AuthFormCard } from "../_components/auth-form-card";
import { AuthPageShell } from "../_components/auth-page-shell";
import { GoogleAuthButton } from "../_components/google-auth-button";
import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "Log in | KaiwaUp",
  description: "Log in to KaiwaUp and continue building your Japanese conversation reflexes.",
};

export default function LoginPage() {
  return (
    <AuthPageShell
      description="Practice listening, pronunciation, and natural responses until Japanese conversation feels more automatic."
      eyebrow="WELCOME BACK"
      japaneseLine="今日も一緒に練習しましょう。"
      japaneseTranslation="Let’s practice together again today."
      title="Keep your conversation reflexes moving."
    >
      <AuthFormCard
        description="Use your KaiwaUp account to continue practicing."
        footer={
          <p className="w-full text-center text-sm">
            New to KaiwaUp?{" "}
            <Link className="font-heading underline underline-offset-4" href="/register">
              Create an account
            </Link>
          </p>
        }
        title="Log in"
      >
        <div className="space-y-6">
          <GoogleAuthButton />
          <div className="flex items-center gap-3 text-xs font-heading uppercase tracking-[0.12em] text-foreground/60">
            <span className="h-0.5 flex-1 bg-border" />
            <span>or use email</span>
            <span className="h-0.5 flex-1 bg-border" />
          </div>
          <LoginForm />
        </div>
      </AuthFormCard>
    </AuthPageShell>
  );
}
