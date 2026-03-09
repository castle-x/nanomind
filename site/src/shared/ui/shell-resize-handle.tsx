import { GripVertical } from "lucide-react";
import type * as React from "react";
import { cn } from "@/shared/lib/utils";

interface ShellResizeHandleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function ShellResizeHandle({
  className,
  active = false,
  type = "button",
  ...props
}: ShellResizeHandleProps) {
  return (
    <button
      type={type}
      aria-label="调整侧栏宽度"
      className={cn(
        "group relative flex w-3 shrink-0 cursor-col-resize touch-none items-center justify-center bg-transparent text-muted-foreground outline-none transition-colors hover:text-foreground",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-primary/60",
          active && "bg-primary/80",
        )}
      />
      <GripVertical
        aria-hidden="true"
        className="relative z-10 size-3.5 rounded-full bg-background"
      />
    </button>
  );
}
