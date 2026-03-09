import { ChevronDown, ChevronRight, PanelLeftClose } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router";
import { buildDocsHref } from "@/shared/lib/docs-utils";
import { cn } from "@/shared/lib/utils";
import type { DocsGroup } from "@/shared/types";
import { ResizeHandle } from "@/shared/ui/resize-handle";

interface Props {
  groups: DocsGroup[];
  currentPageId: string;
  homepage: string;
  width: number;
  collapsed: boolean;
  mobileOpen: boolean;
  isResizing?: boolean;
  onResize: (width: number) => void;
  onResizeActiveChange?: (active: boolean) => void;
  onCollapse: (collapsed: boolean) => void;
  onCloseMobile: () => void;
}

export function DocsSidebar({
  groups,
  currentPageId,
  homepage,
  width,
  collapsed,
  mobileOpen,
  isResizing = false,
  onResize,
  onResizeActiveChange,
  onCollapse,
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

  const startResize = (startClientX: number) => {
    onResizeActiveChange?.(true);
    const startWidth = width;

    const handlePointerMove = (event: PointerEvent) => {
      onResize(startWidth + event.clientX - startClientX);
    };

    const handlePointerUp = () => {
      onResizeActiveChange?.(false);
      window.removeEventListener("pointermove", handlePointerMove);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  const sidebarContent = (
    <>
      <div className="flex h-12 items-center justify-between border-b border-border/60 px-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Documentation
        </span>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={() => onCollapse(true)}
          aria-label="折叠导航"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

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
      <aside
        className={cn(
          "hidden border-r border-border/60 bg-sidebar/35 lg:flex lg:flex-col",
          collapsed && "lg:hidden",
          isResizing && "select-none",
        )}
        style={{ width }}
      >
        {sidebarContent}
      </aside>

      {!collapsed ? (
        <ResizeHandle
          className="hidden lg:flex"
          active={isResizing}
          aria-label="调整导航宽度"
          onPointerDown={(event) => startResize(event.clientX)}
        />
      ) : null}

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-label="关闭导航"
          />
          <aside className="relative z-10 flex h-full w-[84vw] max-w-sm flex-col border-r border-border bg-background shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}
