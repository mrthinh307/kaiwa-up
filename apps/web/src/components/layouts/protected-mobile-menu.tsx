"use client";

import { LogOut, Menu, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLogout } from "@/hooks/use-logout";
import { cn } from "@/lib/utils";

import type { ProtectedHeaderUser } from "./protected-user-menu";

import { isProtectedNavigationHrefActive, PROTECTED_NAVIGATION } from "./protected-navigation";
import { ProtectedUserAvatar } from "./protected-user-avatar";

const mobileLinkClassName =
  "flex min-h-11 items-center gap-3 rounded-base border-2 border-transparent px-3 py-2 font-heading outline-hidden hover:border-border hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function ProtectedMobileMenu({ user }: { user: ProtectedHeaderUser }) {
  const pathname = usePathname();
  const handleLogout = useLogout();
  const isProfileActive = isProtectedNavigationHrefActive(pathname, "/profile");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          aria-label="Open navigation menu"
          className="size-9 bg-secondary-background p-0 text-foreground lg:hidden"
          size="icon"
          variant="neutral"
        >
          <Menu aria-hidden="true" className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex-col overflow-y-auto p-0" side="right">
        <SheetHeader className="border-b-4 border-border p-5 pr-16">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Navigate your learning workspace.</SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-3 border-b-2 border-border bg-background p-5">
          <ProtectedUserAvatar
            avatarUrl={user.avatarUrl}
            className="size-11"
            displayName={user.displayName}
          />
          <div className="min-w-0">
            <p className="truncate font-heading">{user.displayName}</p>
            <p className="truncate text-sm text-foreground/70">{user.email}</p>
          </div>
        </div>

        <nav aria-label="Mobile navigation" className="space-y-6 p-5">
          <div className="space-y-2">
            <p className="px-3 text-xs font-heading uppercase tracking-wide text-foreground/60">
              Learn
            </p>
            {PROTECTED_NAVIGATION.map((item) => {
              if (item.kind === "link") {
                const Icon = item.icon;
                const isActive = isProtectedNavigationHrefActive(pathname, item.href);

                return (
                  <SheetClose asChild key={item.href}>
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        mobileLinkClassName,
                        isActive && "border-border bg-main text-main-foreground",
                      )}
                      href={item.href}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                      {item.label}
                    </Link>
                  </SheetClose>
                );
              }

              return (
                <div className="space-y-1" key={item.label}>
                  <p className="flex min-h-11 items-center gap-3 px-3 font-heading">
                    <item.icon aria-hidden="true" className="size-5" />
                    {item.label}
                  </p>
                  <div className="space-y-1 border-l-2 border-border pl-3">
                    {item.items.map((child) => {
                      const Icon = child.icon;
                      const isActive = isProtectedNavigationHrefActive(pathname, child.href);

                      return (
                        <SheetClose asChild key={child.href}>
                          <Link
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              mobileLinkClassName,
                              isActive && "border-border bg-main text-main-foreground",
                            )}
                            href={child.href}
                          >
                            <Icon aria-hidden="true" className="size-5" />
                            {child.label}
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="px-3 text-xs font-heading uppercase tracking-wide text-foreground/60">
              Account
            </p>
            <SheetClose asChild>
              <Link
                aria-current={isProfileActive ? "page" : undefined}
                className={cn(
                  mobileLinkClassName,
                  isProfileActive && "border-border bg-main text-main-foreground",
                )}
                href="/profile"
              >
                <UserRound aria-hidden="true" className="size-5" />
                Profile
              </Link>
            </SheetClose>
            <Button
              className="min-h-11 w-full justify-start gap-3 px-3 text-destructive"
              onClick={handleLogout}
              type="button"
              variant="neutral"
            >
              <LogOut aria-hidden="true" className="size-5" />
              Log out
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
