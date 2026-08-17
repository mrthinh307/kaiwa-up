"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-border bg-background shadow-xs outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-main",
        className,
      )}
      data-slot="switch"
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-foreground shadow-xs transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-main-foreground data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
