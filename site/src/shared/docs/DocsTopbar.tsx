import {
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  StretchHorizontal,
  SunMedium,
  TableOfContents,
} from "lucide-react";
import { Link } from "react-router";
import { useThemeStore } from "@/shared/hooks/use-theme";
import { cn } from "@/shared/lib/utils";
import type { DocsConfig, DocsContentMode } from "@/shared/types";
import { Button } from "@/shared/ui/button";

interface Props {
  config: DocsConfig;
  contentMode: DocsContentMode;
  leftSidebarCollapsed: boolean;
  rightTocVisible: boolean;
  onToggleContentMode: () => void;
  onToggleLeftSidebar: () => void;
  onToggleRightToc: () => void;
  onOpenMobileSidebar: () => void;
}

export function DocsTopbar({
  config,
  contentMode,
  leftSidebarCollapsed,
  rightTocVisible,
  onToggleContentMode,
  onToggleLeftSidebar,
  onToggleRightToc,
  onOpenMobileSidebar,
}: Props) {
  const darkMode = useThemeStore((state) => state.darkMode);
  const setDarkMode = useThemeStore((state) => state.setDarkMode);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onOpenMobileSidebar}
          aria-label="打开导航"
        >
          <Menu className="size-4" />
        </Button>

        <Link
          to="/docs"
          className="docs-brand-mark flex min-w-0 items-center gap-3"
        >
          <span className="docs-brand-dot" />
          <span className="truncate text-sm font-semibold tracking-[-0.03em] text-foreground">
            {config.site.title}
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
          {config.topbar.showSearch ? (
            <button
              type="button"
              className="docs-search-trigger"
            >
              <Search className="size-4" />
              搜索文档
              <span className="docs-search-kbd">⌘K</span>
            </button>
          ) : (
            <div className="flex-1" />
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {config.topbar.links?.map((link) => (
            <a
              key={`${link.label}-${link.href}`}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noreferrer" : undefined}
              className="hidden rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:inline-flex"
            >
              {link.label}
            </a>
          ))}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleLeftSidebar}
            aria-label={leftSidebarCollapsed ? "展开导航" : "折叠导航"}
          >
            {leftSidebarCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleContentMode}
            aria-label={contentMode === "wide" ? "切换为居中布局" : "切换为通栏布局"}
          >
            <StretchHorizontal
              className={cn("size-4", contentMode === "wide" && "text-foreground")}
            />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleRightToc}
            aria-label={rightTocVisible ? "隐藏目录" : "显示目录"}
          >
            <TableOfContents className={cn("size-4", rightTocVisible && "text-foreground")} />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setDarkMode(!darkMode)}
            aria-label={darkMode ? "切换到浅色模式" : "切换到深色模式"}
          >
            {darkMode ? <SunMedium className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
