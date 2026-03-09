import { NavLink } from "react-router";
import { findFirstPageId } from "@/shared/lib/docs-utils";
import { cn } from "@/shared/lib/utils";
import type { DocsConfig } from "@/shared/types";

interface Props {
  config: DocsConfig;
  activeTabKey: string | null;
}

export function DocsChannelBar({ config, activeTabKey }: Props) {
  if (config.tabs.length <= 1) {
    return null;
  }

  return (
    <div className="sticky top-14 z-30 border-b border-border/60 bg-background/86 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4 lg:px-6">
        {config.tabs.map((tab) => {
          const firstPageId = findFirstPageId(tab);
          const href = firstPageId
            ? firstPageId === config.site.homepage
              ? "/docs"
              : `/docs/${firstPageId}`
            : "/docs";

          return (
            <NavLink
              key={tab.key}
              to={href}
              className={({ isActive }) =>
                cn(
                  "inline-flex h-8 items-center rounded-full border px-3 text-sm transition-colors",
                  isActive || activeTabKey === tab.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-accent/70 hover:text-foreground",
                )
              }
            >
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
