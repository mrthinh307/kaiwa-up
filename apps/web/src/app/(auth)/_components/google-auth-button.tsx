"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function GoogleAuthButton() {
  const handleClick = () => {
    toast.info("Google sign-in is not available yet", {
      description: "Google OAuth will be connected after the authentication backend is ready.",
    });
  };

  return (
    <Button
      className="w-full bg-secondary-background text-foreground"
      onClick={handleClick}
      type="button"
      variant="neutral"
    >
      <span
        aria-hidden="true"
        className="flex size-5 items-center justify-center rounded-full border-2 border-current text-[11px] font-heading"
      >
        G
      </span>
      Continue with Google
    </Button>
  );
}
