"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildPracticeCatalogHref,
  type PracticeCatalogQueryParams,
} from "@/lib/practice-catalog-query";

type PracticeCatalogSearchProps = {
  basePath: string;
  hash?: string;
  id: string;
  initialQuery?: string;
  label?: string;
  placeholder: string;
  preservedParams?: PracticeCatalogQueryParams;
};

export function PracticeCatalogSearch({
  basePath,
  hash,
  id,
  initialQuery,
  label = "Search lessons",
  placeholder,
  preservedParams = {},
}: PracticeCatalogSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery ?? "");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = query.trim().replace(/\s+/g, " ").slice(0, 100);

    if (normalizedQuery === (initialQuery ?? "")) {
      return;
    }

    startTransition(() => {
      const href = buildPracticeCatalogHref({
        basePath,
        params: {
          ...preservedParams,
          q: normalizedQuery || undefined,
        },
      });

      router.push(hash ? `${href}#${hash}` : href);
    });
  };

  return (
    <form aria-busy={isPending} onSubmit={handleSubmit} role="search">
      <Label className="mb-2 block" htmlFor={id}>
        {label}
      </Label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            autoComplete="off"
            className="pl-9"
            disabled={isPending}
            id={id}
            maxLength={100}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            type="search"
            value={query}
          />
        </div>
        <Button disabled={isPending} type="submit">
          Search
        </Button>
      </div>
    </form>
  );
}
