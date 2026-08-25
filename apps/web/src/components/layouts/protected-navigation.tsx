"use client";

import {
  ChevronDown,
  Gauge,
  Headphones,
  Languages,
  LibraryBig,
  Medal,
  MessageCircleMore,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NavigationLink = {
  activePrefixes?: string[];
  href: string;
  icon: LucideIcon;
  kind: "link";
  label: string;
};

type NavigationGroup = {
  icon: LucideIcon;
  items: NavigationLink[];
  kind: "group";
  label: string;
};

type ProtectedNavigationItem = NavigationGroup | NavigationLink;

export const PROTECTED_NAVIGATION: ProtectedNavigationItem[] = [
  {
    href: "/dashboard",
    icon: Gauge,
    kind: "link",
    label: "Dashboard",
  },
  {
    activePrefixes: ["/shadowing", "/dictation"],
    href: "/lessons",
    icon: LibraryBig,
    kind: "link",
    label: "Lessons",
  },
  {
    icon: Headphones,
    items: [
      {
        href: "/reflex",
        icon: Zap,
        kind: "link",
        label: "3-Second Reflex",
      },
      {
        href: "/listening-translation",
        icon: Languages,
        kind: "link",
        label: "Listening Translation",
      },
      {
        href: "/ai-tutor",
        icon: MessageCircleMore,
        kind: "link",
        label: "AI Tutor",
      },
    ],
    kind: "group",
    label: "Advanced",
  },
  {
    href: "/leaderboard",
    icon: Medal,
    kind: "link",
    label: "Leaderboard",
  },
];

export function isProtectedNavigationHrefActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isProtectedNavigationLinkActive(pathname: string, item: NavigationLink): boolean {
  return (
    isProtectedNavigationHrefActive(pathname, item.href) ||
    Boolean(
      item.activePrefixes?.some((prefix) => isProtectedNavigationHrefActive(pathname, prefix)),
    )
  );
}

function isProtectedNavigationItemActive(pathname: string, item: ProtectedNavigationItem): boolean {
  if (item.kind === "link") {
    return isProtectedNavigationLinkActive(pathname, item);
  }

  return item.items.some((child) => isProtectedNavigationLinkActive(pathname, child));
}

export function ProtectedNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
      {PROTECTED_NAVIGATION.map((item) => {
        const isActive = isProtectedNavigationItemActive(pathname, item);

        if (item.kind === "link") {
          const Icon = item.icon;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2 rounded-base border-2 border-transparent px-3 text-base outline-hidden hover:border-border hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive && "border-border bg-main text-main-foreground",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" className="size-4" />
              {item.label}
            </Link>
          );
        }

        const GroupIcon = item.icon;

        return (
          <DropdownMenu key={item.label}>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={`${item.label} menu`}
                className={cn(
                  "h-10 gap-2 border-2 border-transparent bg-transparent px-3 text-foreground shadow-none hover:translate-x-0 hover:translate-y-0 hover:border-border hover:bg-background text-base!",
                  isActive && "border-border bg-main text-main-foreground",
                )}
                variant="noShadow"
              >
                <GroupIcon aria-hidden="true" className="size-4" />
                {item.label}
                <ChevronDown aria-hidden="true" className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56">
              {item.items.map((child) => {
                const Icon = child.icon;
                const isChildActive = isProtectedNavigationLinkActive(pathname, child);

                return (
                  <DropdownMenuItem asChild key={child.href}>
                    <Link aria-current={isChildActive ? "page" : undefined} href={child.href}>
                      <Icon aria-hidden="true" />
                      <span className="text-base">{child.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </nav>
  );
}
