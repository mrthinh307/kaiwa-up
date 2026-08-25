import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ProtectedPageHeaderProps = {
  aside?: ReactNode;
  className?: string;
  description: ReactNode;
  eyebrow?: ReactNode;
  icon?: LucideIcon;
  title: ReactNode;
};

export function ProtectedPageHeader({
  aside,
  className,
  description,
  eyebrow,
  icon: Icon,
  title,
}: ProtectedPageHeaderProps) {
  return (
    <header className={cn(className)}>
      <div
        className={cn("flex flex-col justify-between gap-7", aside && "lg:flex-row lg:items-end")}
      >
        <div className="max-w-[880px]">
          {eyebrow ? (
            <Badge className="mb-5 gap-2 shadow-shadow">
              {Icon ? <Icon aria-hidden="true" /> : null}
              {eyebrow}
            </Badge>
          ) : null}
          <h1 className="text-3xl leading-tight sm:text-4xl lg:text-5xl">{title}</h1>
          <p className="mt-5 max-w-[760px] text-base leading-relaxed text-foreground/75 sm:text-lg">
            {description}
          </p>
        </div>

        {aside}
      </div>
    </header>
  );
}
