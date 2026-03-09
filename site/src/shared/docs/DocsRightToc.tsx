import { List } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { DocsTocItem } from "@/shared/types";

interface Props {
  items: DocsTocItem[];
  visible: boolean;
  activeId?: string | null;
}

export function DocsRightToc({ items, visible, activeId }: Props) {
  if (!visible) {
    return null;
  }

  return (
    <aside className="sticky top-[6.25rem] hidden h-[calc(100vh-6.25rem)] w-64 shrink-0 overflow-y-auto border-l border-border/60 bg-background/72 px-4 py-5 backdrop-blur xl:block">
      <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <List className="size-3" />
        On this page
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">当前页面暂无目录</p>
      ) : (
        <nav className="space-y-1">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                "docs-toc-link",
                item.level === 2 && "is-level-2",
                item.level === 3 && "is-level-3",
                activeId === item.id && "is-active",
              )}
            >
              {item.text}
            </a>
          ))}
        </nav>
      )}
    </aside>
  );
}
