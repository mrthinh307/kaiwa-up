"use client";

import { useEffect } from "react";

type PracticeCatalogPaginationScrollProps = {
  page: number;
  targetId: string;
};

export function PracticeCatalogPaginationScroll({
  page,
  targetId,
}: PracticeCatalogPaginationScrollProps) {
  useEffect(() => {
    if (window.location.hash !== `#${targetId}`) {
      return;
    }

    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start", behavior: "instant" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [page, targetId]);

  return null;
}
