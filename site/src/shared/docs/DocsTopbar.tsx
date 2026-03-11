import { Github, LogIn, Menu, Moon, Search, Settings, SunMedium, Twitter } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useThemeStore } from "@/shared/hooks/use-theme";
import { useAuth } from "@/shared/hooks/useAuth";
import type { DocsConfig } from "@/shared/types";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

interface Props {
  config: DocsConfig;
  onOpenMobileSidebar: () => void;
}

const ICONS: Record<string, React.ElementType> = {
  GitHub: Github,
  Twitter: Twitter,
};

export function DocsTopbar({ config, onOpenMobileSidebar }: Props) {
  const navigate = useNavigate();
  const darkMode = useThemeStore((state) => state.darkMode);
  const setDarkMode = useThemeStore((state) => state.setDarkMode);
  const isAuthenticated = useAuth((state) => state.isAuthenticated);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/88 backdrop-blur-xl">
      <div className="flex h-14 w-full items-center gap-4 px-4 lg:px-6">
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
          to="/"
          className="docs-brand-mark mr-4 flex min-w-0 items-center gap-3"
        >
          <span className="docs-brand-dot" />
          <span className="truncate text-sm font-semibold tracking-[-0.03em] text-foreground">
            {config.site.title}
          </span>
        </Link>

        <div className="flex flex-1 items-center gap-4">
          {config.topbar.showSearch ? (
            <button
              type="button"
              className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Search className="size-4" />
              <span>搜索文档...</span>
              <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {config.topbar.links?.map((link) => {
            const Icon = ICONS[link.label] || null;
            return (
              <a
                key={`${link.label}-${link.href}`}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noreferrer" : undefined}
                className="hidden rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:inline-flex"
                title={link.label}
              >
                {Icon ? (
                  <Icon className="size-4" />
                ) : (
                  <span className="text-sm font-medium">{link.label}</span>
                )}
              </a>
            );
          })}

          <div className="mx-1 h-4 w-px bg-border/60" />

          {/* Admin Entry */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => navigate(isAuthenticated ? "/editor" : "/login")}
                  aria-label={isAuthenticated ? "进入编辑模式" : "管理员登录"}
                >
                  {isAuthenticated ? <Settings className="size-4" /> : <LogIn className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isAuthenticated ? "进入编辑模式" : "管理员登录"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="切换主题"
          >
            {darkMode ? <Moon className="size-4" /> : <SunMedium className="size-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
