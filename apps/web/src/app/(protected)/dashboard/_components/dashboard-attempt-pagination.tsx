"use client";

import type { MouseEvent } from "react";

import { useRouter } from "next/navigation";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

import type {
  DashboardAttemptStatus,
  DashboardPracticeMode,
} from "../_utils/dashboard-api-adapter";

import { buildDashboardHref } from "../_utils/dashboard-query";

type PaginationEntry = number | "ellipsis-end" | "ellipsis-start";

function getPaginationEntries(page: number, pages: number): PaginationEntry[] {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", pages];
  }

  if (page >= pages - 3) {
    return [1, "ellipsis-start", pages - 4, pages - 3, pages - 2, pages - 1, pages];
  }

  return [1, "ellipsis-start", page - 1, page, page + 1, "ellipsis-end", pages];
}

export function DashboardAttemptPagination({
  mode,
  page,
  pages,
  searchQuery,
  status,
}: {
  mode?: DashboardPracticeMode;
  page: number;
  pages: number;
  searchQuery?: string;
  status?: DashboardAttemptStatus;
}) {
  const router = useRouter();

  if (pages <= 1) {
    return null;
  }

  const hrefForPage = (nextPage: number) =>
    `${buildDashboardHref({ mode, page: nextPage, searchQuery, status })}#dashboard-attempts-heading`;
  const handlePageClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    router.push(href);
  };

  return (
    <Pagination aria-label="Attempt history pages" className="mt-8">
      <PaginationContent className="flex-wrap gap-2">
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={page <= 1}
            className={cn(
              "[&_span]:hidden sm:[&_span]:inline",
              page <= 1 && "pointer-events-none opacity-50",
            )}
            href={page > 1 ? hrefForPage(page - 1) : undefined}
            onClick={
              page > 1 ? (event) => handlePageClick(event, hrefForPage(page - 1)) : undefined
            }
            tabIndex={page <= 1 ? -1 : undefined}
          />
        </PaginationItem>

        {getPaginationEntries(page, pages).map((entry) =>
          typeof entry === "number" ? (
            <PaginationItem key={entry}>
              <PaginationLink
                aria-label={`Go to attempt page ${entry}`}
                href={hrefForPage(entry)}
                isActive={entry === page}
                onClick={(event) => handlePageClick(event, hrefForPage(entry))}
              >
                {entry}
              </PaginationLink>
            </PaginationItem>
          ) : (
            <PaginationItem key={entry}>
              <PaginationEllipsis />
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            aria-disabled={page >= pages}
            className={cn(
              "[&_span]:hidden sm:[&_span]:inline",
              page >= pages && "pointer-events-none opacity-50",
            )}
            href={page < pages ? hrefForPage(page + 1) : undefined}
            onClick={
              page < pages ? (event) => handlePageClick(event, hrefForPage(page + 1)) : undefined
            }
            tabIndex={page >= pages ? -1 : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
