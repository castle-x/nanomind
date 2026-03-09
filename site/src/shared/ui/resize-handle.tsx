import type * as React from "react";
import { cn } from "@/shared/lib/utils";

interface ResizeHandleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function ResizeHandle({
  className,
  active = false,
  type = "button",
  ...props
}: ResizeHandleProps) {
  return (
    <button
      type={type}
      className={cn(
        "group relative flex w-2 cursor-col-resize touch-none items-stretch justify-center",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "h-full w-px bg-border/80 transition-colors group-hover:bg-primary/60",
          active && "bg-primary/80",
        )}
      />
    </button>
  );
}
