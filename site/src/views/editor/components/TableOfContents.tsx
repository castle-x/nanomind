import { List } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";
import type { TocItem } from "@/shared/types";
import { useAppStore } from "@/views/editor/model/editor-store";

interface TableOfContentsProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

/** Slugify heading text to create a stable key */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Get all h1-h3 headings from the container */
function queryHeadings(container: HTMLElement | null): NodeListOf<HTMLHeadingElement> | [] {
  if (!container) return [];
  return container.querySelectorAll<HTMLHeadingElement>("h1, h2, h3");
}

export function TableOfContents({ scrollContainerRef }: TableOfContentsProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const currentPath = useAppStore((s) => s.currentPath);
  const content = useAppStore((s) => s.content);

  /**
   * Extract headings from the editor DOM.
   * Does NOT modify the DOM — avoids infinite loops with ProseMirror.
   */
  const extractHeadings = useCallback(() => {
    const headings = queryHeadings(scrollContainerRef.current);
    const tocItems: TocItem[] = [];
    const idCounts = new Map<string, number>();

    headings.forEach((heading, index) => {
      const text = heading.textContent?.trim() || "";
      if (!text) return;

      let id = slugify(text);
      const count = idCounts.get(id) || 0;
      idCounts.set(id, count + 1);
      if (count > 0) id = `${id}-${count}`;

      const level = Number.parseInt(heading.tagName[1], 10);
      tocItems.push({ id, text, level, index });
    });

    setItems(tocItems);
  }, [scrollContainerRef]);

  // Clear items when no file is open
  useEffect(() => {
    if (!currentPath) setItems([]);
  }, [currentPath]);

  // Re-extract headings on file switch (with delay for editor to render)
  useEffect(() => {
    if (!currentPath) return;
    const timer = setTimeout(extractHeadings, 200);
    return () => clearTimeout(timer);
  }, [currentPath, extractHeadings]);

  // Re-extract when content changes (editor updates, 500ms debounce)
  useEffect(() => {
    if (!currentPath) return;

    void content;
    const timer = setTimeout(extractHeadings, 500);
    return () => clearTimeout(timer);
  }, [content, currentPath, extractHeadings]);

  // Scroll tracking — highlight current heading by index lookup
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

  /** Click to scroll — find heading by index at click time */
  const handleClick = (index: number) => {
    const el = queryHeadings(scrollContainerRef.current)[index];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const indent: Record<number, string> = {
    1: "pl-3",
    2: "pl-6",
    3: "pl-9",
  };

  return (
    <aside className="hidden xl:block w-48 border-l border-border p-4 overflow-y-auto shrink-0">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-3">
        <List className="w-3 h-3" />
        On this page
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground/40">—</p>
      ) : (
        <nav className="flex flex-col gap-0.5">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => handleClick(item.index)}
              className={cn(
                "text-left text-xs py-0.5 truncate transition-colors rounded",
                indent[item.level] || "pl-3",
                activeId === item.id
                  ? "text-primary font-medium"
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
