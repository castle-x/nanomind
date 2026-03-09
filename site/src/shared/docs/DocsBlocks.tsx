import { CheckCircle2, Info, Lightbulb, TriangleAlert, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  DocsCalloutTone,
  DocsCodeGroupItem,
  DocsStepItem,
  DocsTabItem,
} from "@/shared/lib/docs-blocks";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Surface } from "@/shared/ui/surface";
import { MarkdownFragment } from "./DocMarkdown";

interface DocsCalloutProps {
  tone: DocsCalloutTone;
  title?: string;
  content: string;
}

interface DocsStepsProps {
  items: DocsStepItem[];
}

interface DocsCodeGroupProps {
  items: DocsCodeGroupItem[];
}

interface DocsTabsProps {
  items: DocsTabItem[];
}

function getCalloutMeta(tone: DocsCalloutTone) {
  switch (tone) {
    case "tip":
      return { icon: Lightbulb, title: "技巧" };
    case "success":
      return { icon: CheckCircle2, title: "完成" };
    case "warning":
      return { icon: TriangleAlert, title: "注意" };
    case "danger":
      return { icon: XCircle, title: "风险" };
    default:
      return { icon: Info, title: "说明" };
  }
}

export function DocsCallout({ tone, title, content }: DocsCalloutProps) {
  const meta = getCalloutMeta(tone);
  const Icon = meta.icon;

  return (
    <Surface className={cn("docs-callout", `docs-callout-${tone}`)}>
      <div className="docs-callout-header">
        <span className="docs-callout-icon">
          <Icon className="size-4" />
        </span>
        <span className="docs-callout-title">{title || meta.title}</span>
      </div>
      <MarkdownFragment
        markdown={content}
        className="docs-callout-body"
      />
    </Surface>
  );
}

export function DocsSteps({ items }: DocsStepsProps) {
  return (
    <div className="docs-steps">
      {items.map((item, index) => (
        <div
          key={`${item.title}-${index}`}
          className="docs-step-item"
        >
          <div className="docs-step-marker">
            <span>{index + 1}</span>
          </div>
          <div className="docs-step-card">
            <h3 className="docs-step-title">{item.title}</h3>
            <MarkdownFragment
              markdown={item.content}
              className="docs-step-body"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CodePanel({ item }: { item: DocsCodeGroupItem }) {
  return (
    <div className="docs-code-panel">
      <div className="docs-code-panel-header">
        <span className="docs-code-panel-title">{item.title}</span>
        <span className="docs-code-panel-language">{item.language}</span>
      </div>
      <pre className="docs-code-panel-pre">
        <code>{item.code}</code>
      </pre>
    </div>
  );
}

export function DocsCodeGroup({ items }: DocsCodeGroupProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = activeIndex >= items.length ? 0 : activeIndex;
  const activeItem = items[safeIndex];

  if (items.length === 0 || !activeItem) {
    return null;
  }

  return (
    <div className="docs-code-group">
      <div className="docs-code-group-tabs">
        {items.map((item, index) => (
          <Button
            key={`${item.title}-${index}`}
            type="button"
            variant="ghost"
            size="sm"
            className={cn("docs-code-group-trigger", index === safeIndex && "is-active")}
            onClick={() => setActiveIndex(index)}
          >
            {item.title}
          </Button>
        ))}
      </div>
      <CodePanel item={activeItem} />
    </div>
  );
}

export function DocsTabs({ items }: DocsTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = activeIndex >= items.length ? 0 : activeIndex;
  const activeItem = useMemo(() => items[safeIndex], [items, safeIndex]);

  if (items.length === 0 || !activeItem) {
    return null;
  }

  return (
    <div className="docs-tabs-block">
      <div
        className="docs-tabs-list"
        role="tablist"
        aria-label="内容切换"
      >
        {items.map((item, index) => (
          <button
            key={`${item.title}-${index}`}
            type="button"
            role="tab"
            aria-selected={index === safeIndex}
            className={cn("docs-tabs-trigger", index === safeIndex && "is-active")}
            onClick={() => setActiveIndex(index)}
          >
            {item.title}
          </button>
        ))}
      </div>
      <Surface
        className="docs-tabs-panel"
        tone="muted"
      >
        <MarkdownFragment
          markdown={activeItem.content}
          className="docs-tabs-body"
        />
      </Surface>
    </div>
  );
}
