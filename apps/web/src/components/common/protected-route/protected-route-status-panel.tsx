import type { ReactNode } from "react";

import { AlertCircle, LockKeyhole } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type ProtectedRouteStatusPanelProps = {
  action: ReactNode;
  description: string;
  title: string;
  variant: "error" | "unauthorized";
};

export function ProtectedRouteStatusPanel({
  action,
  description,
  title,
  variant,
}: ProtectedRouteStatusPanelProps) {
  const Icon = variant === "unauthorized" ? LockKeyhole : AlertCircle;

  return (
    <Card className="mx-auto max-w-[680px] border-4 bg-secondary-background">
      <CardContent className="flex flex-col items-center px-6 py-8 text-center sm:px-10 sm:py-12">
        <span className="flex size-14 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground shadow-shadow">
          <Icon aria-hidden="true" className="size-7" />
        </span>
        <h2 className="mt-7 text-2xl sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-[500px] leading-relaxed text-foreground/75">{description}</p>
        <div className="mt-7">{action}</div>
      </CardContent>
    </Card>
  );
}
