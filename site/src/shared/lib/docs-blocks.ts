export type DocsCalloutTone = "info" | "tip" | "success" | "warning" | "danger";

export interface DocsMarkdownSegment {
  type: "markdown";
  content: string;
}

export interface DocsCalloutBlock {
  type: "callout";
  tone: DocsCalloutTone;
  title?: string;
  content: string;
}

export interface DocsStepItem {
  title: string;
  content: string;
}

export interface DocsStepsBlock {
  type: "steps";
  items: DocsStepItem[];
}

export interface DocsCodeGroupItem {
  title: string;
  language: string;
  code: string;
}

export interface DocsCodeGroupBlock {
  type: "code-group";
  items: DocsCodeGroupItem[];
}

export interface DocsTabItem {
  title: string;
  content: string;
}

export interface DocsTabsBlock {
  type: "tabs";
  items: DocsTabItem[];
}

export type DocsContentBlock =
  | DocsMarkdownSegment
  | DocsCalloutBlock
  | DocsStepsBlock
  | DocsCodeGroupBlock
  | DocsTabsBlock;

function parseAttributes(raw: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const matcher = /(\w+)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;

  for (const match of raw.matchAll(matcher)) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attributes[key] = value;
  }

  return attributes;
}

function parseSectionItems(
  body: string,
  fallbackPrefix: string,
): Array<{ title: string; content: string }> {
  const lines = body.split("\n");
  const items: Array<{ title: string; content: string }> = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  const pushCurrent = () => {
    const content = currentLines.join("\n").trim();
    if (!currentTitle && !content) {
      return;
    }

    items.push({
      title: currentTitle || `${fallbackPrefix} ${items.length + 1}`,
      content,
    });
  };

  for (const line of lines) {
    const sectionMatch = /^###\s+(.+)$/.exec(line.trim());
    if (sectionMatch) {
      pushCurrent();
      currentTitle = sectionMatch[1].trim();
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  pushCurrent();

  if (items.length === 0 && body.trim()) {
    return [{ title: `${fallbackPrefix} 1`, content: body.trim() }];
  }

  return items;
}

function parseCodeGroupItems(body: string): DocsCodeGroupItem[] {
  const items: DocsCodeGroupItem[] = [];
  const fencePattern = /```([^\n]*)\n([\s\S]*?)```/g;

  for (const match of body.matchAll(fencePattern)) {
    const info = (match[1] ?? "").trim();
    const code = (match[2] ?? "").replace(/\n$/, "");
    const [languageToken = "", ...restTokens] = info.split(/\s+/).filter(Boolean);
    const attributes = parseAttributes(restTokens.join(" "));
    const language = languageToken || "text";
    const title = attributes.title || language.toUpperCase() || `Code ${items.length + 1}`;

    items.push({ title, language, code });
  }

  return items;
}

function parseTabItems(body: string): DocsTabItem[] {
  const lines = body.split("\n");
  const items: DocsTabItem[] = [];
  let index = 0;

  while (index < lines.length) {
    const startMatch = /^:::tab\b(.*)$/.exec(lines[index].trim());

    if (!startMatch) {
      index += 1;
      continue;
    }

    const attributes = parseAttributes(startMatch[1] ?? "");
    const title = attributes.title || attributes.label || `标签 ${items.length + 1}`;
    const bodyLines: string[] = [];
    let cursor = index + 1;
    let closed = false;

    while (cursor < lines.length) {
      if (lines[cursor].trim() === ":::") {
        closed = true;
        break;
      }

      bodyLines.push(lines[cursor]);
      cursor += 1;
    }

    if (!closed) {
      break;
    }

    items.push({
      title,
      content: bodyLines.join("\n").trim(),
    });
    index = cursor + 1;
  }

  if (items.length === 0 && body.trim()) {
    return parseSectionItems(body, "标签");
  }

  return items;
}

function normalizeCalloutTone(raw: string | undefined): DocsCalloutTone {
  switch (raw) {
    case "note":
    case "info":
      return "info";
    case "tip":
    case "success":
    case "warning":
    case "danger":
      return raw;
    default:
      return "info";
  }
}

export function parseDocsContent(markdown: string): DocsContentBlock[] {
  const lines = markdown.split("\n");
  const blocks: DocsContentBlock[] = [];
  let buffer: string[] = [];

  const flushBuffer = () => {
    const content = buffer.join("\n").trim();
    if (content) {
      blocks.push({ type: "markdown", content });
    }
    buffer = [];
  };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const startMatch =
      /^:::(note|tip|success|warning|danger|callout|steps|code-group|tabs)\b(.*)$/.exec(
        line.trim(),
      );

    if (!startMatch) {
      buffer.push(line);
      index += 1;
      continue;
    }

    const kind = startMatch[1];
    const attributes = parseAttributes(startMatch[2] ?? "");
    const bodyLines: string[] = [];
    let cursor = index + 1;
    let closed = false;

    while (cursor < lines.length) {
      if (lines[cursor].trim() === ":::") {
        closed = true;
        break;
      }

      bodyLines.push(lines[cursor]);
      cursor += 1;
    }

    if (!closed) {
      buffer.push(line);
      index += 1;
      continue;
    }

    flushBuffer();
    const body = bodyLines.join("\n").trim();

    if (["note", "tip", "success", "warning", "danger", "callout"].includes(kind)) {
      blocks.push({
        type: "callout",
        tone: normalizeCalloutTone(
          kind === "callout" ? (attributes.type ?? attributes.tone) : kind,
        ),
        title: attributes.title,
        content: body,
      });
    }

    if (kind === "steps") {
      blocks.push({ type: "steps", items: parseSectionItems(body, "步骤") });
    }

    if (kind === "code-group") {
      blocks.push({ type: "code-group", items: parseCodeGroupItems(body) });
    }

    if (kind === "tabs") {
      blocks.push({ type: "tabs", items: parseTabItems(body) });
    }

    index = cursor + 1;
  }

  flushBuffer();
  return blocks;
}
