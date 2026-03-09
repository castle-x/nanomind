export type DocsCalloutVariant = "note" | "tip" | "warning" | "danger" | "info" | "success";

export interface DocsMarkdownBlock {
  type: "markdown";
  content: string;
}

export interface DocsCalloutBlock {
  type: "callout";
  variant: DocsCalloutVariant;
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

export interface DocsTabItem {
  title: string;
  content: string;
}

export interface DocsTabsBlock {
  type: "tabs";
  items: DocsTabItem[];
}

export interface DocsCodeGroupItem {
  title: string;
  lang?: string;
  code: string;
}

export interface DocsCodeGroupBlock {
  type: "code-group";
  items: DocsCodeGroupItem[];
}

export type DocsContentBlock =
  | DocsMarkdownBlock
  | DocsCalloutBlock
  | DocsStepsBlock
  | DocsTabsBlock
  | DocsCodeGroupBlock;

function collectUntilContainerEnd(lines: string[], startIndex: number) {
  const body: string[] = [];
  let cursor = startIndex;

  while (cursor < lines.length && lines[cursor]?.trim() !== ":::") {
    body.push(lines[cursor] ?? "");
    cursor += 1;
  }

  return {
    body: body.join("\n").trim(),
    nextIndex: cursor < lines.length ? cursor + 1 : cursor,
  };
}

function flushMarkdown(buffer: string[], blocks: DocsContentBlock[]) {
  const content = buffer.join("\n").trim();
  if (content) {
    blocks.push({ type: "markdown", content });
  }
  buffer.length = 0;
}

function parseSteps(content: string): DocsStepsBlock {
  const items: DocsStepItem[] = [];
  const lines = content.split("\n");
  let currentTitle = "";
  let currentBody: string[] = [];

  const pushCurrent = () => {
    if (!currentTitle) {
      return;
    }

    items.push({
      title: currentTitle,
      content: currentBody.join("\n").trim(),
    });
  };

  for (const line of lines) {
    const match = /^###\s+(.+)$/.exec(line.trim());
    if (match) {
      pushCurrent();
      currentTitle = match[1].trim();
      currentBody = [];
      continue;
    }

    currentBody.push(line);
  }

  pushCurrent();
  return { type: "steps", items };
}

function parseCodeFenceInfo(info: string) {
  const raw = info.trim();
  if (!raw) {
    return { lang: undefined, title: "Code" };
  }

  const titleMatch = /title="([^"]+)"/.exec(raw);
  const parts = raw.split(/\s+/).filter(Boolean);
  const lang = parts[0] && !parts[0].includes("=") ? parts[0] : undefined;
  const fallbackTitle = parts[1] && !parts[1].includes("=") ? parts[1] : undefined;

  return {
    lang,
    title: titleMatch?.[1] ?? fallbackTitle ?? lang?.toUpperCase() ?? "Code",
  };
}

function parseCodeGroup(content: string): DocsCodeGroupBlock {
  const items: DocsCodeGroupItem[] = [];
  const matcher = /```([^\n`]*)\n([\s\S]*?)```/g;

  for (const match of content.matchAll(matcher)) {
    const info = parseCodeFenceInfo(match[1] ?? "");
    items.push({
      title: info.title,
      lang: info.lang,
      code: (match[2] ?? "").replace(/\n$/, ""),
    });
  }

  return { type: "code-group", items };
}

function parseTabs(content: string): DocsTabsBlock {
  const items: DocsTabItem[] = [];
  const lines = content.split("\n");
  let currentTitle = "";
  let currentBody: string[] = [];

  const pushCurrent = () => {
    if (!currentTitle) {
      return;
    }

    items.push({
      title: currentTitle,
      content: currentBody.join("\n").trim(),
    });
  };

  for (const line of lines) {
    const match = /^@tab\s+(.+)$/.exec(line.trim());
    if (match) {
      pushCurrent();
      currentTitle = match[1].trim();
      currentBody = [];
      continue;
    }

    currentBody.push(line);
  }

  pushCurrent();
  return { type: "tabs", items };
}

export function parseDocsContent(markdown: string): DocsContentBlock[] {
  const blocks: DocsContentBlock[] = [];
  const buffer: string[] = [];
  const lines = markdown.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? "";
    const calloutMatch = /^:::(note|tip|warning|danger|info|success)(?:\s+(.+))?$/.exec(line);

    if (calloutMatch) {
      flushMarkdown(buffer, blocks);
      const { body, nextIndex } = collectUntilContainerEnd(lines, index + 1);
      blocks.push({
        type: "callout",
        variant: calloutMatch[1] as DocsCalloutVariant,
        title: calloutMatch[2]?.trim(),
        content: body,
      });
      index = nextIndex;
      continue;
    }

    if (line === ":::steps") {
      flushMarkdown(buffer, blocks);
      const { body, nextIndex } = collectUntilContainerEnd(lines, index + 1);
      blocks.push(parseSteps(body));
      index = nextIndex;
      continue;
    }

    if (line === ":::code-group") {
      flushMarkdown(buffer, blocks);
      const { body, nextIndex } = collectUntilContainerEnd(lines, index + 1);
      blocks.push(parseCodeGroup(body));
      index = nextIndex;
      continue;
    }

    if (line === ":::tabs") {
      flushMarkdown(buffer, blocks);
      const { body, nextIndex } = collectUntilContainerEnd(lines, index + 1);
      blocks.push(parseTabs(body));
      index = nextIndex;
      continue;
    }

    buffer.push(lines[index] ?? "");
    index += 1;
  }

  flushMarkdown(buffer, blocks);
  return blocks;
}
