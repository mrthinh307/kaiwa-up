import Link from "next/link";

const practiceLinks = [
  { href: "/#core-methods", label: "Dual Shadowing" },
  { href: "/#core-methods", label: "Dictation" },
  { href: "/#core-methods", label: "3-Second Reflex" },
  { href: "/#core-methods", label: "AI Tutor 1-on-1" },
];

const exploreLinks = [
  { href: "/#methods", label: "Methods" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#progress", label: "Progress" },
  { href: "/#faq", label: "FAQ" },
];

const accountLinks = [
  { href: "/register", label: "Get started" },
  { href: "/login", label: "Log in" },
];

function GitHubMark() {
  return (
    <svg aria-hidden="true" className="size-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23A11.5 11.5 0 0 1 12 5.8c1.02 0 2.04.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.3c0 .32.22.69.83.57A12 12 0 0 0 12 0Z" />
    </svg>
  );
}

function FooterLinkGroup({
  heading,
  headingId,
  links,
}: {
  heading: string;
  headingId: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <nav aria-labelledby={headingId}>
      <h2 className="font-heading text-lg" id={headingId}>
        {heading}
      </h2>
      <ul className="mt-5 space-y-3 text-sm sm:text-base">
        {links.map(({ href, label }) => (
          <li key={label}>
            <Link
              className="underline-offset-4 transition-colors hover:text-main hover:underline"
              href={href}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-foreground px-5 text-background sm:px-8">
      <div className="mx-auto grid max-w-[1300px] gap-12 py-14 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr] md:py-20">
        <div className="max-w-[440px]">
          <Link aria-label="KaiwaUp home" className="inline-flex items-center gap-3" href="/#hero">
            <span className="flex size-10 items-center justify-center rounded-base border-2 border-background bg-main text-2xl font-heading text-main-foreground">
              K
            </span>
            <span className="text-2xl font-heading">KaiwaUp</span>
          </Link>
          <p className="mt-6 text-base leading-relaxed text-background/75 sm:text-lg">
            Interactive listening and speaking practice that turns Japanese knowledge into real
            conversation reflexes.
          </p>
          <a
            className="mt-6 inline-flex items-center gap-2 font-heading underline-offset-4 hover:text-main hover:underline"
            href="https://github.com/thanhbt25/KaiwaUp"
            rel="noreferrer"
            target="_blank"
          >
            <GitHubMark />
            Open source on GitHub
          </a>
        </div>

        <FooterLinkGroup heading="Practice" headingId="footer-practice" links={practiceLinks} />
        <FooterLinkGroup heading="Explore" headingId="footer-explore" links={exploreLinks} />
        <FooterLinkGroup heading="Account" headingId="footer-account" links={accountLinks} />
      </div>

      <div className="mx-auto flex max-w-[1300px] flex-col justify-between gap-3 border-t-2 border-background/25 py-6 text-sm text-background/65 sm:flex-row sm:items-center">
        <p>© 2026 KaiwaUp. Built for Japanese learners.</p>
        <p>Released under the MIT License.</p>
      </div>
    </footer>
  );
}
