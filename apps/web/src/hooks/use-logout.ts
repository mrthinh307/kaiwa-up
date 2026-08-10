"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useLogout(): () => void {
  const router = useRouter();

  return useCallback(() => {
    router.replace("/login");
    router.refresh();
  }, [router]);
}
