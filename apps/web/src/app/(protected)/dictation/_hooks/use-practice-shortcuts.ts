"use client";

import { useEffect } from "react";

type UsePracticeShortcutsOptions = {
  disabled?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  onReplay?: () => void;
};

export function usePracticeShortcuts({
  disabled = false,
  onNext,
  onPrevious,
  onReplay,
}: UsePracticeShortcutsOptions) {
  useEffect(() => {
    if (disabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) {
        return;
      }

      const isModifier = event.ctrlKey || event.metaKey;
      const isAlt = event.altKey;

      // Replay shortcut: Ctrl+Space, Cmd+Space, or Alt+R
      if (
        (isModifier && event.code === "Space") ||
        (isAlt && (event.key === "r" || event.key === "R"))
      ) {
        event.preventDefault();
        onReplay?.();
        return;
      }

      // Previous segment shortcut: Ctrl+ArrowLeft or Cmd+ArrowLeft
      if (isModifier && event.key === "ArrowLeft") {
        event.preventDefault();
        onPrevious?.();
        return;
      }

      // Next segment shortcut: Ctrl+ArrowRight or Cmd+ArrowRight
      if (isModifier && event.key === "ArrowRight") {
        event.preventDefault();
        onNext?.();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [disabled, onNext, onPrevious, onReplay]);
}
