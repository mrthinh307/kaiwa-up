import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  buildPracticeCatalogHref,
  type PracticeCatalogQueryParams,
} from "@/lib/practice-catalog-query";
import { cn } from "@/lib/utils";

type PracticeCatalogPaginationProps = {
  ariaLabel: string;
  basePath: string;
  page: number;
  pages: number;
  params?: PracticeCatalogQueryParams;
};

export function PracticeCatalogPagination({
  ariaLabel,
  basePath,
  page,
  pages,
  params = {},
}: PracticeCatalogPaginationProps) {
  if (pages <= 1) {
    return null;
  }

  const getPageHref = (pageNumber: number) =>
    buildPracticeCatalogHref({
      basePath,
      params: {
        ...params,
        page: pageNumber > 1 ? pageNumber : undefined,
      },
    });
  const pageNumbers = Array.from({ length: pages }, (_, index) => index + 1);

  return (
    <Pagination aria-label={ariaLabel} className="mt-8">
      <PaginationContent className="flex-wrap gap-2">
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={page <= 1}
            className={cn(page <= 1 && "pointer-events-none opacity-50")}
            href={page > 1 ? getPageHref(page - 1) : undefined}
            tabIndex={page <= 1 ? -1 : undefined}
          />
        </PaginationItem>

        {pageNumbers.map((pageNumber) => (
          <PaginationItem key={pageNumber}>
            <PaginationLink
              aria-label={`Go to page ${pageNumber}`}
              href={getPageHref(pageNumber)}
              isActive={pageNumber === page}
            >
              {pageNumber}
            </PaginationLink>
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            aria-disabled={page >= pages}
            className={cn(page >= pages && "pointer-events-none opacity-50")}
            href={page < pages ? getPageHref(page + 1) : undefined}
            tabIndex={page >= pages ? -1 : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
