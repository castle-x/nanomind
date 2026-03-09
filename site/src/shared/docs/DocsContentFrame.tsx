import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import type { DocsContentMode } from "@/shared/types";

interface Props {
  mode: DocsContentMode;
  children: ReactNode;
}

export function DocsContentFrame({ mode, children }: Props) {
  return (
    <div className="docs-content-scroll h-full overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(120,120,120,0.06),transparent_36%)]">
      <div
        className={cn(
          "mx-auto w-full px-6 py-8 lg:px-10 lg:py-10",
          mode === "wide" ? "max-w-[1180px]" : "max-w-[920px]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
