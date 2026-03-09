import { Children, isValidElement, type ReactNode, useMemo } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseDocsContent } from "@/shared/lib/docs-blocks";
import { createHeadingIdResolver } from "@/shared/lib/docs-utils";
import { cn } from "@/shared/lib/utils";
import { DocsCallout, DocsCodeGroup, DocsSteps, DocsTabs } from "./DocsBlocks";

interface Props {
  markdown: string;
  className?: string;
}

interface MarkdownFragmentProps {
  markdown: string;
  className?: string;
}

function getNodeText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }

      if (isValidElement<{ children?: ReactNode }>(child)) {
        return getNodeText(child.props.children);
      }

      return "";
    })
    .join("");
}

export function MarkdownFragment({ markdown, className }: MarkdownFragmentProps) {
  const components = useMemo<Components>(() => {
    const resolveHeadingId = createHeadingIdResolver();

    return {
      h1: ({ children, ...props }) => (
        <h1
          id={resolveHeadingId(getNodeText(children))}
          {...props}
        >
          {children}
        </h1>
      ),
      h2: ({ children, ...props }) => (
        <h2
          id={resolveHeadingId(getNodeText(children))}
          {...props}
        >
          {children}
        </h2>
      ),
      h3: ({ children, ...props }) => (
        <h3
          id={resolveHeadingId(getNodeText(children))}
          {...props}
        >
          {children}
        </h3>
      ),
      a: ({ href, children, ...props }) => {
        const external = typeof href === "string" && /^https?:\/\//.test(href);

        return (
          <a
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer" : undefined}
            {...props}
          >
            {children}
          </a>
        );
      },
      table: ({ children, ...props }) => (
        <div className="docs-table-wrap">
          <table {...props}>{children}</table>
        </div>
      ),
      pre: ({ children }) => <pre>{children}</pre>,
      code: ({ className: codeClassName, children, ...props }) => {
        const inline = !String(codeClassName ?? "").includes("language-");
        return (
          <code
            className={cn(!inline && "docs-code-inline", codeClassName)}
            {...props}
          >
            {children}
          </code>
        );
      },
    };
  }, []);

  return (
    <div className={cn("docs-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

export function DocMarkdown({ markdown, className }: Props) {
  const blocks = useMemo(() => parseDocsContent(markdown), [markdown]);

  return (
    <div className={cn("docs-rich-content", className)}>
      {blocks.map((block) => {
        if (block.type === "markdown") {
          return (
            <MarkdownFragment
              key={`markdown-${block.content.slice(0, 32)}`}
              markdown={block.content}
            />
          );
        }

        if (block.type === "callout") {
          return (
            <DocsCallout
              key={`callout-${block.title ?? block.content.slice(0, 24)}`}
              tone={block.tone}
              title={block.title}
              content={block.content}
            />
          );
        }

        if (block.type === "steps") {
          return (
            <DocsSteps
              key={`steps-${block.items[0]?.title ?? "empty"}`}
              items={block.items}
            />
          );
        }

        if (block.type === "code-group") {
          return (
            <DocsCodeGroup
              key={`code-group-${block.items[0]?.title ?? "empty"}`}
              items={block.items}
            />
          );
        }

        return (
          <DocsTabs
            key={`tabs-${block.items[0]?.title ?? "empty"}`}
            items={block.items}
          />
        );
      })}
    </div>
  );
}
