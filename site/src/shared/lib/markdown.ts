import { marked } from "marked";
import TurndownService from "turndown";

/**
 * Configure marked for GFM support
 */
marked.setOptions({
  gfm: true,
  breaks: false,
});

/**
 * Convert Markdown text to HTML string for Tiptap
 */
export function markdownToHtml(md: string): string {
  if (!md.trim()) return "";

  // Pre-process task lists: - [ ] / - [x]
  const processed = md.replace(
    /^(\s*)- \[([ xX])\] (.*)$/gm,
    (_match, indent: string, checked: string, text: string) => {
      const isChecked = checked.toLowerCase() === "x";
      const level = Math.floor(indent.length / 2);
      const indentStr = "  ".repeat(level);
      return `${indentStr}<li data-type="taskItem" data-checked="${isChecked}">${text}</li>`;
    },
  );

  // Wrap consecutive taskItem li's in taskList ul
  const withTaskLists = processed.replace(
    /((?:<li data-type="taskItem"[^>]*>.*<\/li>\n?)+)/g,
    '<ul data-type="taskList">\n$1</ul>\n',
  );

  const html = marked.parse(withTaskLists) as string;
  return html;
}

/**
 * Configure turndown for HTML → Markdown conversion
 */
function createTurndownService(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
  });

  // Strikethrough
  td.addRule("strikethrough", {
    filter: ["del", "s"],
    replacement: (content) => `~~${content}~~`,
  });

  // Underline — preserve as HTML tag
  td.addRule("underline", {
    filter: ["u"],
    replacement: (content) => `<u>${content}</u>`,
  });

  // Task list items
  td.addRule("taskListItem", {
    filter: (node) => {
      return node.nodeName === "LI" && node.getAttribute("data-type") === "taskItem";
    },
    replacement: (content, node) => {
      const checked = (node as Element).getAttribute("data-checked") === "true";
      const checkbox = checked ? "[x]" : "[ ]";
      const trimmed = content.replace(/^\n+/, "").replace(/\n+$/, "");
      return `- ${checkbox} ${trimmed}\n`;
    },
  });

  // Task list container — just pass through children
  td.addRule("taskList", {
    filter: (node) => {
      return node.nodeName === "UL" && node.getAttribute("data-type") === "taskList";
    },
    replacement: (content) => `\n${content}\n`,
  });

  // Horizontal rule
  td.addRule("horizontalRule", {
    filter: "hr",
    replacement: () => "\n---\n",
  });

  return td;
}

const turndownService = createTurndownService();

/**
 * Convert HTML string back to Markdown
 */
export function htmlToMarkdown(html: string): string {
  if (!html.trim()) return "";
  return turndownService.turndown(html);
}

/**
 * Heuristic: check if plain text looks like Markdown.
 * Used to decide whether to convert pasted text before inserting into Tiptap.
 */
export function looksLikeMarkdown(text: string): boolean {
  if (!text || text.length < 3) return false;

  // Strong indicators — any single match is enough
  const strongPatterns: RegExp[] = [
    /^#{1,6}\s+\S/m, // # Heading
    /^```/m, // Code fence
    /^\s*- \[[ xX]\]\s/m, // Task list
  ];

  for (const p of strongPatterns) {
    if (p.test(text)) return true;
  }

  // Weak indicators — need 2+ matches
  const weakPatterns: RegExp[] = [
    /^\s*[-*+]\s+\S/m, // Unordered list
    /^\s*\d+\.\s+\S/m, // Ordered list
    /^\s*>\s+/m, // Blockquote
    /\*\*\S[\s\S]*?\S\*\*/, // **bold**
    /(?<!\*)\*\S[\s\S]*?\S\*(?!\*)/, // *italic*
    /\[.+?\]\(.+?\)/, // [link](url)
    /^---$/m, // Horizontal rule
    /!\[.*?\]\(.+?\)/, // ![image](url)
  ];

  let count = 0;
  for (const p of weakPatterns) {
    if (p.test(text)) count++;
  }

  return count >= 2;
}
