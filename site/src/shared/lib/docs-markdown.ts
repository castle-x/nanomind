import { marked } from "marked";
import type { DocsTocItem } from "@/shared/types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function renderDocsMarkdown(markdown: string): { html: string; toc: DocsTocItem[] } {
  const toc: DocsTocItem[] = [];
  const headingCounts = new Map<string, number>();
  const renderer = new marked.Renderer();

  renderer.heading = ({ tokens, depth }) => {
    const text = tokens
      .map((token) => token.raw)
      .join("")
      .trim();
    const baseId = slugify(text || `section-${toc.length + 1}`);
    const count = headingCounts.get(baseId) ?? 0;
    headingCounts.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count}`;

    if (depth >= 1 && depth <= 3) {
      toc.push({ id, text, level: depth });
    }

    const innerHtml = renderer.parser.parseInline(tokens);
    return `<h${depth} id="${id}">${innerHtml}</h${depth}>`;
  };

  const html = marked.parse(markdown, {
    gfm: true,
    breaks: false,
    renderer,
  }) as string;

  return { html, toc };
}
