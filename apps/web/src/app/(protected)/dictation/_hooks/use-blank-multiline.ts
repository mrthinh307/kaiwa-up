"use client";

import { useEffect, useRef, useState } from "react";

const MULTILINE_HEIGHT_THRESHOLD_PX = 48;

/**
 * Hook to detect whether a dictation blank textarea input spans multiple lines.
 * Switches alignment and layout styling dynamically between single-line and multi-line states.
 */
export function useBlankMultiline(value: string) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMultiLine, setIsMultiLine] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const checkMultiLine = () => {
      const hasMultipleLines =
        value.includes("\n") || textarea.scrollHeight > MULTILINE_HEIGHT_THRESHOLD_PX;
      setIsMultiLine(hasMultipleLines);
    };

    checkMultiLine();

    const resizeObserver = new ResizeObserver(() => {
      checkMultiLine();
    });

    resizeObserver.observe(textarea);

    return () => {
      resizeObserver.disconnect();
    };
  }, [value]);

  return { isMultiLine, textareaRef };
}
