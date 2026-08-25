import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { formatMemberSince, getDisplayNameInitials } from "../_utils/profile-formatters";

type ProfileIdentityCardProps = {
  avatarUrl: string | null;
  className?: string;
  createdAt: string;
  displayName: string;
  email: string;
};

export function ProfileIdentityCard({
  avatarUrl,
  className,
  createdAt,
  displayName,
  email,
}: ProfileIdentityCardProps) {
  return (
    <Card className={cn("border-4 bg-main text-main-foreground", className)}>
      <CardContent className="h-full flex flex-col justify-center items-center px-5 text-center sm:px-6 lg:py-2">
        <div className="relative mb-6 flex size-24 items-center justify-center rounded-full border-2 border-border bg-secondary-background text-3xl font-heading text-foreground shadow-shadow sm:size-28 sm:text-4xl">
          {avatarUrl ? (
            <Image
              alt={`${displayName}'s avatar`}
              className="rounded-full object-cover"
              fill
              sizes="(min-width: 640px) 112px, 96px"
              src={avatarUrl}
            />
          ) : (
            <span aria-label={`${displayName}'s initials`}>
              {getDisplayNameInitials(displayName)}
            </span>
          )}
        </div>

        <h2 className="break-words text-2xl leading-tight sm:text-3xl">{displayName}</h2>
        <p className="mt-2 break-all text-sm sm:text-base">{email}</p>

        <div className="mt-7 w-full border-t-2 border-border pt-5">
          <p className="text-xs font-heading uppercase tracking-[0.12em]">Member since</p>
          <p className="mt-1 text-base">{formatMemberSince(createdAt)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
