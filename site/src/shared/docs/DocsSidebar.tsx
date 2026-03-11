import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router";
import { buildDocsHref } from "@/shared/lib/docs-utils";
import { cn } from "@/shared/lib/utils";
import type { DocsGroup } from "@/shared/types";

interface Props {
  groups: DocsGroup[];
  currentPageId: string;
  homepage: string;
  width: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function DocsSidebar({
  groups,
  currentPageId,
  homepage,
  width,
  mobileOpen,
  onCloseMobile,
}: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedGroups((current) => {
      const next = { ...current };

      for (const group of groups) {
        if (next[group.key] == null) {
          next[group.key] = true;
        }
      }

      return next;
    });
  }, [groups]);

  const visibleGroups = useMemo(
    () => groups.filter((group) => group.pages.some((page) => !page.hidden)),
    [groups],
  );

  const sidebarContent = (
    <>
      <div className="docs-shell-scroll flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-6">
          {visibleGroups.map((group) => {
            const expanded = expandedGroups[group.key] ?? true;
            const visiblePages = group.pages.filter((page) => !page.hidden);

            return (
              <section key={group.key}>
                <button
                  type="button"
                  className="mb-2 flex w-full items-center gap-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  onClick={() =>
                    setExpandedGroups((current) => ({
                      ...current,
                      [group.key]: !expanded,
                    }))
                  }
                >
                  {expanded ? (
                    <ChevronDown className="size-3" />
                  ) : (
                    <ChevronRight className="size-3" />
                  )}
                  {group.label}
                </button>

                {expanded ? (
                  <div className="space-y-1">
                    {visiblePages.map((page) => (
                      <NavLink
                        key={page.id}
                        to={buildDocsHref(page.id, homepage)}
                        onClick={onCloseMobile}
                        className={({ isActive }) =>
                          cn(
                            "docs-sidebar-link",
                            (isActive || page.id === currentPageId) && "is-active",
                          )
                        }
                      >
                        {page.title ?? page.id}
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="sticky top-[6.25rem] hidden h-[calc(100vh-6.25rem)] shrink-0 flex-col border-r border-border/60 bg-background/72 backdrop-blur xl:flex"
        style={{ width }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex xl:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={onCloseMobile}
          aria-label="关闭侧边栏"
        />
        <aside
          className={cn(
            "relative flex h-full w-3/4 max-w-sm flex-col border-r border-border bg-background shadow-2xl transition-transform",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  );
}
