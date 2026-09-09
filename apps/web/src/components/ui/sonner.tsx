"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      style={{ fontFamily: "inherit", overflowWrap: "anywhere" }}
      toastOptions={{
        unstyled: true,
        closeButton: true,
        classNames: {
          toast:
            "bg-secondary-background text-foreground border-border border-2 font-heading shadow-shadow rounded-base text-sm flex items-center gap-2.5 p-4 w-[min(356px,calc(100vw-2rem))] [&:has([data-close-button])]:pr-12",
          content: "min-w-0 flex-1",
          title: "text-sm",
          description: "text-xs font-base font-normal",
          closeButton:
            "absolute top-2 right-2 flex size-6 items-center justify-center rounded-base border border-border bg-secondary-background text-foreground hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          actionButton:
            "font-base border-2 text-[12px] h-6 px-2 bg-main text-main-foreground border-border rounded-base shrink-0",
          cancelButton:
            "font-base border-2 text-[12px] h-6 px-2 bg-secondary-background text-foreground border-border rounded-base shrink-0",
          error: "bg-destructive text-destructive-foreground",
          loading:
            "[&[data-sonner-toast]_[data-icon]]:flex [&[data-sonner-toast]_[data-icon]]:size-4 [&[data-sonner-toast]_[data-icon]]:relative [&[data-sonner-toast]_[data-icon]]:justify-start [&[data-sonner-toast]_[data-icon]]:items-center [&[data-sonner-toast]_[data-icon]]:flex-shrink-0",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
