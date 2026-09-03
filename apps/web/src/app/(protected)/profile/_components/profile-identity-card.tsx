import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { formatMemberSince } from "../_utils/profile-formatters";
import { AvatarEditor } from "./avatar-editor";

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
      <CardContent className="flex h-full flex-col items-center justify-between p-6 text-center sm:p-7">
        <div className="flex w-full flex-col items-center">
          <AvatarEditor avatarUrl={avatarUrl} displayName={displayName} />

          <h2 className="mt-5 break-words text-2xl font-heading leading-tight text-foreground sm:text-3xl">
            {displayName}
          </h2>
          <p className="mt-1.5 break-all text-sm font-base text-foreground/80 sm:text-base">
            {email}
          </p>
        </div>

        <div className="mt-8 w-full border-t-2 border-border pt-5">
          <p className="text-xs font-heading uppercase tracking-[0.14em]">Member since</p>
          <p className="mt-1 text-base font-base">{formatMemberSince(createdAt)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
