"use client";

import { useEffect } from "react";

export type UseShadowingShortcutsOptions = {
  disabled?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  onTogglePlay?: () => void;
  onToggleRecord?: () => void;
};

export function useShadowingShortcuts({
  disabled = false,
  onNext,
  onPrevious,
  onTogglePlay,
  onToggleRecord,
}: UseShadowingShortcutsOptions) {
  useEffect(() => {
    if (disabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isInput =
        target !== null &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      const isModifier = event.ctrlKey || event.metaKey;
      const isAlt = event.altKey;

      // Spacebar for play/pause when not in an input, or Ctrl+Space / Cmd+Space
      if (
        (event.code === "Space" && !isInput && !isModifier && !isAlt) ||
        (isModifier && event.code === "Space")
      ) {
        event.preventDefault();
        onTogglePlay?.();
        return;
      }

      // Record shortcut: R key when not in an input, or Alt+R
      if (
        (event.key.toLowerCase() === "r" && !isInput && !isModifier && !isAlt) ||
        (isAlt && event.key.toLowerCase() === "r")
      ) {
        event.preventDefault();
        onToggleRecord?.();
        return;
      }

      // Previous segment shortcut: Ctrl+ArrowLeft, Cmd+ArrowLeft, or ArrowLeft when not in input
      if (
        (isModifier && event.key === "ArrowLeft") ||
        (!isInput && !isModifier && !isAlt && event.key === "ArrowLeft")
      ) {
        event.preventDefault();
        onPrevious?.();
        return;
      }

      // Next segment shortcut: Ctrl+ArrowRight, Cmd+ArrowRight, or ArrowRight when not in input
      if (
        (isModifier && event.key === "ArrowRight") ||
        (!isInput && !isModifier && !isAlt && event.key === "ArrowRight")
      ) {
        event.preventDefault();
        onNext?.();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [disabled, onNext, onPrevious, onTogglePlay, onToggleRecord]);
}
