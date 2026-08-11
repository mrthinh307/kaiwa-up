import Image from "next/image";

import { cn } from "@/lib/utils";

type ProtectedUserAvatarProps = {
  avatarUrl: string | null;
  className?: string;
  displayName: string;
};

function getInitials(displayName: string): string {
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts.at(0);
  const lastName = nameParts.at(-1);

  if (!firstName) {
    return "U";
  }

  if (!lastName || firstName === lastName) {
    return firstName.slice(0, 1).toLocaleUpperCase();
  }

  return `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toLocaleUpperCase();
}

export function ProtectedUserAvatar({
  avatarUrl,
  className,
  displayName,
}: ProtectedUserAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full border-1 border-border bg-main text-[10px] font-heading text-main-foreground",
        className,
      )}
    >
      {avatarUrl ? (
        <Image alt="" className="object-cover" fill sizes="20px" src={avatarUrl} />
      ) : (
        getInitials(displayName)
      )}
    </span>
  );
}
