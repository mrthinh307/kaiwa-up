import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-base border-2 border-border bg-secondary-background motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
