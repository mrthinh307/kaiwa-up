import Link from "next/link";

import { ThemeSwitcher } from "@/components/common/theme/theme-switcher";
import { Button } from "@/components/ui/button";

const navigationLinks = [
  { href: "/#methods", label: "Methods" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#progress", label: "Progress" },
  { href: "/#faq", label: "FAQ" },
];

function GitHubMark() {
  return (
    <svg aria-hidden="true" className="size-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23A11.5 11.5 0 0 1 12 5.8c1.02 0 2.04.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.3c0 .32.22.69.83.57A12 12 0 0 0 12 0Z" />
    </svg>
  );
}

export function PublicNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-[70px] items-center border-b-4 border-border bg-secondary-background px-5">
      <div className="mx-auto flex w-[1300px] max-w-full items-center justify-between">
        <div className="flex items-center gap-8 xl:gap-12">
          <Link aria-label="KaiwaUp home" className="flex items-center gap-3" href="/">
            <span className="flex size-8 items-center justify-center rounded-base border-2 border-black bg-main text-[22px] font-heading text-main-foreground">
              K
            </span>
            <span className="hidden text-xl font-heading sm:inline">KaiwaUp</span>
          </Link>
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-8 text-base lg:flex"
          >
            {navigationLinks.map(({ href, label }) => (
              <a className="underline-offset-4 hover:underline" href={href} key={href}>
                {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            asChild
            className="hidden h-9 bg-secondary-background px-3 text-foreground sm:inline-flex"
            variant="neutral"
          >
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild className="h-9 px-3 sm:px-4">
            <Link href="/register">Get started</Link>
          </Button>
          <Button
            asChild
            className="size-9 bg-secondary-background p-0 text-foreground"
            size="icon"
            variant="neutral"
          >
            <a
              aria-label="View KaiwaUp on GitHub"
              href="https://github.com/thanhbt25/KaiwaUp"
              rel="noreferrer"
              target="_blank"
            >
              <GitHubMark />
            </a>
          </Button>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
