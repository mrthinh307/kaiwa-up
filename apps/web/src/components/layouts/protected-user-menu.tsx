"use client";

import { ChevronDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";

import { ProtectedUserAvatar } from "./protected-user-avatar";

export type ProtectedHeaderUser = {
  avatarUrl: string | null;
  displayName: string;
  email: string;
};

export function ProtectedUserMenu({ user }: { user: ProtectedHeaderUser }) {
  const pathname = usePathname();
  const { isLoggingOut, logout } = useAuth();
  const isProfileActive = pathname === "/profile" || pathname.startsWith("/profile/");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Open user menu for ${user.displayName}`}
          className="max-w-52 gap-2"
          size="sm"
          variant="neutral"
        >
          <ProtectedUserAvatar
            avatarUrl={user.avatarUrl}
            className="size-5 border-0"
            displayName={user.displayName}
          />
          <span className="min-w-0 truncate">{user.displayName}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5 py-2">
          <span className="block truncate">{user.displayName}</span>
          <span className="block truncate font-base text-xs text-foreground/70">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link aria-current={isProfileActive ? "page" : undefined} href="/profile">
            <UserRound aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive hover:text-destructive-foreground! hover:bg-destructive! hover:cursor-pointer"
          disabled={isLoggingOut}
          onSelect={() => void logout()}
        >
          <LogOut aria-hidden="true" />
          {isLoggingOut ? "Logging out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
