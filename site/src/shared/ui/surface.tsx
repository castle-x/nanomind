import type * as React from "react";
import { cn } from "@/shared/lib/utils";

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: "default" | "muted" | "transparent";
}

export function Surface({ className, tone = "default", ...props }: SurfaceProps) {
  return (
    <div
      className={cn(
        tone === "default" && "rounded-xl border border-border/70 bg-background/95",
        tone === "muted" && "rounded-xl border border-border/60 bg-muted/30",
        tone === "transparent" && "bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
