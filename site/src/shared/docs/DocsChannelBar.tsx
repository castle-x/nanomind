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
      <div className="flex h-12 w-full items-center gap-6 px-4 lg:px-6">
        {config.tabs.map((tab) => {
          const firstPageId = findFirstPageId(tab);
          const href = firstPageId
            ? firstPageId === config.site.homepage
              ? "/"
              : `/${firstPageId}`
            : "/";

          const isActive = activeTabKey === tab.key;

          return (
            <NavLink
              key={tab.key}
              to={href}
              className={cn(
                "relative flex h-full items-center text-sm font-medium transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {isActive && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-foreground" />}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
