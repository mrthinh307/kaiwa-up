"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogout } from "@/hooks/use-logout";
import { cn } from "@/lib/utils";

export function ProfileSessionCard({ className }: { className?: string }) {
  const handleLogout = useLogout();

  return (
    <Card className={cn("bg-secondary-background", className)}>
      <CardHeader className="gap-3">
        <CardTitle className="text-xl sm:text-2xl">Session</CardTitle>
        <CardDescription>Sign out of KaiwaUp on this device.</CardDescription>
        <CardAction>
          <Button
            className="h-9 px-3 text-destructive"
            onClick={handleLogout}
            size="sm"
            type="button"
            variant="neutral"
          >
            <LogOut aria-hidden="true" />
            Log out
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
