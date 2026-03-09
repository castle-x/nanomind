import type * as React from "react";
import { cn } from "@/shared/lib/utils";

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle";
}

export function Panel({ className, variant = "default", ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60",
        variant === "subtle" && "border-border/40 bg-background/40",
        className,
      )}
      {...props}
    />
  );
}
