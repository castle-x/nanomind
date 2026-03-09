import { parseDocsContent } from "@/shared/lib/docs-blocks";
import type {
  DocsConfig,
  DocsContentMode,
  DocsPageContext,
  DocsPageRef,
  DocsTab,
  DocsTocItem,
} from "@/shared/types";

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[<>]/g, "")
    .replace(/[^\w\u4e00-\u9fff\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createHeadingIdResolver() {
  const counts = new Map<string, number>();

  return (text: string): string => {
    const baseId = slugifyHeading(text) || "section";
    const count = counts.get(baseId) ?? 0;
    counts.set(baseId, count + 1);
    return count === 0 ? baseId : `${baseId}-${count}`;
  };
}

function extractMarkdownToc(
  content: string,
  resolveHeadingId: (text: string) => string,
): DocsTocItem[] {
  const items: DocsTocItem[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    const match = /^(#{1,3})\s+(.+)$/.exec(line);

    if (!match) {
      continue;
    }

    items.push({
      id: resolveHeadingId(match[2].trim()),
      text: match[2].trim(),
      level: match[1].length,
    });
  }

  return items;
}

export function extractDocsToc(content: string): DocsTocItem[] {
  const resolveHeadingId = createHeadingIdResolver();
  const blocks = parseDocsContent(content);
  const items: DocsTocItem[] = [];

  for (const block of blocks) {
    if (block.type === "markdown") {
      items.push(...extractMarkdownToc(block.content, resolveHeadingId));
    }

    if (block.type === "steps") {
      for (const item of block.items) {
        items.push({
          id: resolveHeadingId(item.title),
          text: item.title,
          level: 3,
        });
      }
    }
  }

  return items;
}

export function buildDocsHref(pageId: string, homepage: string): string {
  return pageId === homepage ? "/docs" : `/docs/${pageId}`;
}

export function findFirstPageId(tab: DocsTab | null | undefined): string | null {
  if (!tab) {
    return null;
  }

  for (const group of tab.groups) {
    const visiblePage = group.pages.find((page) => !page.hidden);
    if (visiblePage) {
      return visiblePage.id;
    }
  }

  return null;
}

export function findDocsPageContext(config: DocsConfig, pageId: string): DocsPageContext {
  for (const tab of config.tabs) {
    for (const group of tab.groups) {
      const page = group.pages.find((item) => item.id === pageId);
      if (page) {
        return { tab, group, page };
      }
    }
  }

  return { tab: null, group: null, page: null };
}

export function findSiblingPages(config: DocsConfig, pageId: string): DocsPageRef[] {
  const context = findDocsPageContext(config, pageId);

  if (!context.group) {
    return [];
  }

  return context.group.pages.filter((page) => !page.hidden && page.id !== pageId);
}

export function resolveContentMode(
  pageMode?: DocsContentMode,
  defaultMode?: DocsContentMode,
): DocsContentMode {
  return pageMode ?? defaultMode ?? "centered";
}

export function flattenDocsPages(config: DocsConfig): DocsPageRef[] {
  return config.tabs.flatMap((tab) => tab.groups.flatMap((group) => group.pages));
}
