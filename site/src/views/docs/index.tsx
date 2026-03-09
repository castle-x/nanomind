import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { DocMarkdown, DocsShell } from "@/shared/docs";
import { getDocsConfig, getDocsPage } from "@/shared/lib/docs-client";
import { buildDocsHref, extractDocsToc, findDocsPageContext } from "@/shared/lib/docs-utils";
import type { DocsTocItem } from "@/shared/types";
import { Button } from "@/shared/ui/button";
import { Surface } from "@/shared/ui/surface";

interface EmptyStateProps {
  title: string;
  description: string;
  showHomeLink?: boolean;
}

function EmptyState({ title, description, showHomeLink = false }: EmptyStateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Surface className="max-w-xl p-8 text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        {showHomeLink ? (
          <Button
            className="mt-6"
            asChild
          >
            <Link to="/docs">返回文档首页</Link>
          </Button>
        ) : null}
      </Surface>
    </div>
  );
}

export function DocsView() {
  const params = useParams();
  const articleRef = useRef<HTMLElement>(null);
  const [activeTocId, setActiveTocId] = useState<string | null>(null);

  const pageParam = params["*"]?.replace(/^\/+|\/+$/g, "") ?? "";

  const configQuery = useQuery({
    queryKey: ["docs-config"],
    queryFn: getDocsConfig,
    retry: false,
  });

  const currentPageId = pageParam || configQuery.data?.site.homepage || "";

  const pageQuery = useQuery({
    queryKey: ["docs-page", currentPageId],
    queryFn: () => getDocsPage(currentPageId),
    enabled: Boolean(configQuery.data && currentPageId),
    retry: false,
  });

  const pageContext = useMemo(() => {
    if (!configQuery.data || !currentPageId) {
      return { tab: null, group: null, page: null };
    }

    return findDocsPageContext(configQuery.data, currentPageId);
  }, [configQuery.data, currentPageId]);

  const tocItems = useMemo<DocsTocItem[]>(() => {
    if (!pageQuery.data || pageQuery.data.toc === false) {
      return [];
    }

    return extractDocsToc(pageQuery.data.content);
  }, [pageQuery.data]);

  useEffect(() => {
    if (tocItems.length === 0) {
      setActiveTocId(null);
      return;
    }

    setActiveTocId(tocItems[0]?.id ?? null);
  }, [tocItems]);

  useEffect(() => {
    if (!articleRef.current || tocItems.length === 0) {
      return undefined;
    }

    const headings = Array.from(articleRef.current.querySelectorAll("h1, h2, h3"));
    if (headings.length === 0) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);

        const nextHeading = visibleEntries[0]?.target;
        if (nextHeading instanceof HTMLElement && nextHeading.id) {
          setActiveTocId(nextHeading.id);
        }
      },
      {
        rootMargin: "0px 0px -70% 0px",
        threshold: [0, 1],
      },
    );

    for (const heading of headings) {
      observer.observe(heading);
    }

    return () => observer.disconnect();
  }, [tocItems]);

  if (configQuery.isLoading || pageQuery.isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (configQuery.isError || !configQuery.data) {
    return (
      <EmptyState
        title="文档站尚未初始化"
        description="还没有读取到 docs 配置，请先在内容根目录中创建 docs.json。"
      />
    );
  }

  if (configQuery.data.tabs.length === 0) {
    return (
      <EmptyState
        title="文档导航为空"
        description="请先在 docs.json 中配置 tabs、groups 和 pages。"
      />
    );
  }

  if (pageQuery.isError || !pageQuery.data) {
    return (
      <EmptyState
        title="文档不存在"
        description="当前页面未找到，请检查 docs.json 与 Markdown 路径是否一致。"
        showHomeLink
      />
    );
  }

  return (
    <DocsShell
      config={configQuery.data}
      activeTabKey={pageContext.tab?.key ?? configQuery.data.tabs[0]?.key ?? null}
      groups={pageContext.tab?.groups ?? configQuery.data.tabs[0]?.groups ?? []}
      currentPageId={currentPageId}
      tocItems={tocItems}
      activeTocId={activeTocId}
      contentMode={
        pageQuery.data.contentMode ?? configQuery.data.site.defaultContentMode ?? "centered"
      }
    >
      <article
        ref={articleRef}
        className="docs-prose"
      >
        <div className="docs-page-header">
          <div className="docs-page-eyebrow-row">
            <span className="docs-page-eyebrow">
              {pageContext.group?.label ?? pageContext.tab?.label ?? "Docs"}
            </span>
            <span className="docs-page-id">{pageQuery.data.id}</span>
          </div>
          <h1>{pageQuery.data.title}</h1>
          {pageQuery.data.description ? (
            <p className="docs-lead">{pageQuery.data.description}</p>
          ) : null}
        </div>

        <DocMarkdown markdown={pageQuery.data.content} />

        <div className="docs-page-footer">
          <span>你正在阅读 {pageQuery.data.title}</span>
          <Link
            className="docs-page-footer-link"
            to={buildDocsHref(configQuery.data.site.homepage, configQuery.data.site.homepage)}
          >
            返回首页
          </Link>
        </div>
      </article>
    </DocsShell>
  );
}
