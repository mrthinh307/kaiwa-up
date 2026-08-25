"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { PracticeCatalogOption } from "@/types/practice-catalog";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  buildPracticeCatalogHref,
  type PracticeCatalogQueryParams,
} from "@/lib/practice-catalog-query";
import { cn } from "@/lib/utils";

type PracticeCatalogComboboxFilterProps = {
  allLabel: string;
  basePath: string;
  emptyMessage: string;
  id: string;
  label: string;
  options: readonly PracticeCatalogOption[];
  preservedParams?: PracticeCatalogQueryParams;
  queryKey: string;
  searchLabel: string;
  searchPlaceholder: string;
  onValueChange?: (value: string | undefined) => void;
  value?: string;
};

export function PracticeCatalogComboboxFilter({
  allLabel,
  basePath,
  emptyMessage,
  id,
  label,
  options,
  preservedParams = {},
  queryKey,
  searchLabel,
  searchPlaceholder,
  onValueChange,
  value,
}: PracticeCatalogComboboxFilterProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectedValue = value ?? "all";
  const selectedLabel =
    selectedValue === "all"
      ? allLabel
      : (options.find((option) => option.value === selectedValue)?.label ?? allLabel);

  const handleValueChange = (nextValue: string) => {
    setIsOpen(false);

    if (nextValue === selectedValue) {
      return;
    }

    if (onValueChange) {
      onValueChange(nextValue === "all" ? undefined : nextValue);
      return;
    }

    startTransition(() => {
      router.push(
        buildPracticeCatalogHref({
          basePath,
          params: {
            ...preservedParams,
            [queryKey]: nextValue === "all" ? undefined : nextValue,
          },
        }),
      );
    });
  };

  return (
    <div aria-busy={isPending}>
      <Label className="mb-2 block" htmlFor={id}>
        {label}
      </Label>
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-expanded={isOpen}
            className="w-full justify-between"
            disabled={isPending}
            id={id}
            role="combobox"
            type="button"
            variant="noShadow"
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronsUpDown aria-hidden="true" className="opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0 shadow-shadow"
        >
          <Command className="border-0">
            <CommandInput aria-label={searchLabel} placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                <CommandItem keywords={[allLabel]} onSelect={handleValueChange} value="all">
                  <Check
                    aria-hidden="true"
                    className={cn("opacity-0", selectedValue === "all" && "opacity-100")}
                  />
                  {allLabel}
                </CommandItem>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    keywords={[option.label]}
                    onSelect={handleValueChange}
                    value={option.value}
                  >
                    <Check
                      aria-hidden="true"
                      className={cn("opacity-0", selectedValue === option.value && "opacity-100")}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
