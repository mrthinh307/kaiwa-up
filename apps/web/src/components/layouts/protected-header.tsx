import Link from "next/link";

import { ThemeSwitcher } from "@/components/common/theme/theme-switcher";

import type { ProtectedHeaderUser } from "./protected-user-menu";

import { ProtectedMobileMenu } from "./protected-mobile-menu";
import { ProtectedNavigation } from "./protected-navigation";
import { ProtectedUserMenu } from "./protected-user-menu";

export function ProtectedHeader({ user }: { user: ProtectedHeaderUser }) {
  return (
    <header className="sticky inset-x-0 top-0 z-40 flex h-[70px] items-center border-b-4 border-border bg-secondary-background px-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-[1300px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-8 xl:gap-12">
          <Link aria-label="KaiwaUp home" className="flex shrink-0 items-center gap-3" href="/">
            <span className="flex size-8 items-center justify-center rounded-base border-2 border-border bg-main text-[22px] font-heading text-main-foreground">
              K
            </span>
            <span className="hidden text-xl font-heading sm:inline">KaiwaUp</span>
          </Link>
          <ProtectedNavigation />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden lg:block">
            <ProtectedUserMenu user={user} />
          </div>
          <ThemeSwitcher />
          <ProtectedMobileMenu user={user} />
        </div>
      </div>
    </header>
  );
}
