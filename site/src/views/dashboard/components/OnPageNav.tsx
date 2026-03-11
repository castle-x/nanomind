import { List } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn, slugifyHeading } from "@/shared/lib/utils";
import type { TocItem } from "@/shared/types";
import { useDashboardStore } from "@/views/dashboard/model/dashboard-store";

interface Props {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

function queryHeadings(container: HTMLElement | null): NodeListOf<HTMLHeadingElement> | [] {
  if (!container) return [];
  return container.querySelectorAll<HTMLHeadingElement>("h1, h2, h3");
}

export function OnPageNav({ scrollContainerRef }: Props) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const currentPath = useDashboardStore((s) => s.currentPath);
  const content = useDashboardStore((s) => s.content);

  const extractHeadings = useCallback(() => {
    const headings = queryHeadings(scrollContainerRef.current);
    const tocItems: TocItem[] = [];
    const idCounts = new Map<string, number>();

    headings.forEach((heading, index) => {
      const text = heading.textContent?.trim() || "";
      if (!text) return;

      let id = slugifyHeading(text);
      const count = idCounts.get(id) || 0;
      idCounts.set(id, count + 1);
      if (count > 0) id = `${id}-${count}`;

      const level = Number.parseInt(heading.tagName[1], 10);
      tocItems.push({ id, text, level, index });
    });

    setItems(tocItems);
  }, [scrollContainerRef]);

  useEffect(() => {
    if (!currentPath) setItems([]);
  }, [currentPath]);

  useEffect(() => {
    if (!currentPath) return;
    const timer = setTimeout(extractHeadings, 200);
    return () => clearTimeout(timer);
  }, [currentPath, extractHeadings]);

  useEffect(() => {
    if (!currentPath) return;
    void content;
    const timer = setTimeout(extractHeadings, 500);
    return () => clearTimeout(timer);
  }, [content, currentPath, extractHeadings]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || items.length === 0) return;

    const handleScroll = () => {
      const headings = queryHeadings(container);
      const scrollTop = container.scrollTop;
      let currentId: string | null = null;

      for (const item of items) {
        const el = headings[item.index];
        if (el) {
          const offset = el.offsetTop - 12;
          if (offset <= scrollTop) {
            currentId = item.id;
          }
        }
      }
      setActiveId(currentId);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef, items]);

  const handleClick = (index: number) => {
    const el = queryHeadings(scrollContainerRef.current)[index];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!currentPath) return null;

  const indent: Record<number, string> = {
    1: "pl-3",
    2: "pl-6",
    3: "pl-9",
  };

  return (
    <aside className="hidden w-48 shrink-0 overflow-y-auto border-l border-border p-4 xl:block">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
        <List className="h-3 w-3" />
        目录
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground/40">&mdash;</p>
      ) : (
        <nav className="flex flex-col gap-0.5">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => handleClick(item.index)}
              className={cn(
                "truncate rounded py-0.5 text-left text-xs transition-colors",
                indent[item.level] || "pl-3",
                activeId === item.id
                  ? "font-medium text-primary"
                  : "text-muted-foreground/70 hover:text-foreground",
              )}
              title={item.text}
            >
              {item.text}
            </button>
          ))}
        </nav>
      )}
    </aside>
  );
}
