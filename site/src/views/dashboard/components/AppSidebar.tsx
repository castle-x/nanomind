import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  FileText,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useThemeStore } from "@/shared/hooks/use-theme";
import { useAuth } from "@/shared/hooks/useAuth";
import { listSpaces } from "@/shared/lib/api-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { useDashboardStore } from "@/views/dashboard/model/dashboard-store";
import { CreateSpaceDialog } from "./CreateSpaceDialog";

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 45%)`;
}

const NAV_ITEMS = [
  { key: "home" as const, icon: Home, label: "主页" },
  { key: "editor" as const, icon: FileText, label: "编辑器" },
  { key: "settings" as const, icon: Settings, label: "设置" },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const currentSpaceId = useDashboardStore((s) => s.currentSpaceId);
  const setCurrentSpaceId = useDashboardStore((s) => s.setCurrentSpaceId);
  const activeSection = useDashboardStore((s) => s.activeSection);
  const setActiveSection = useDashboardStore((s) => s.setActiveSection);
  const sidebarCollapsed = useDashboardStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useDashboardStore((s) => s.setSidebarCollapsed);

  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const darkMode = useThemeStore((s) => s.darkMode);
  const setDarkMode = useThemeStore((s) => s.setDarkMode);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: spaces = [] } = useQuery({
    queryKey: ["spaces"],
    queryFn: listSpaces,
  });

  const currentSpace = spaces.find((s) => s.id === currentSpaceId);

  function handleSelectSpace(spaceId: string) {
    setCurrentSpaceId(spaceId);
    navigate(`/dashboard/${spaceId}`);
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const collapsed = sidebarCollapsed;

  return (
    <TooltipProvider>
      <div
        className={`flex h-full flex-col border-r border-border bg-background transition-all duration-200 ${
          collapsed ? "w-[48px]" : "w-[220px]"
        }`}
      >
        {/* Top — Space Selector */}
        <div className="border-b border-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                  collapsed ? "justify-center" : ""
                }`}
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded text-xs font-semibold text-white"
                  style={{
                    backgroundColor: currentSpace
                      ? hashColor(currentSpace.name)
                      : "hsl(0, 0%, 60%)",
                  }}
                >
                  {currentSpace?.name.charAt(0).toUpperCase() ?? "?"}
                </span>
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1 truncate text-left font-medium">
                      {currentSpace?.name ?? "选择空间"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={collapsed ? "right" : "bottom"}
              align="start"
              className="w-[200px]"
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">空间</DropdownMenuLabel>
              {spaces.map((space) => (
                <DropdownMenuItem
                  key={space.id}
                  onClick={() => handleSelectSpace(space.id)}
                  className="gap-2"
                >
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: hashColor(space.name) }}
                  />
                  <span className="truncate">{space.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setCreateOpen(true)}
                className="gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                创建空间
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Middle — Navigation */}
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.key;
            const btn = (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSection(item.key)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return btn;
          })}
        </nav>

        {/* Bottom — User + Collapse */}
        <div className="border-t border-border p-2">
          <div className="flex flex-col gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                    collapsed ? "justify-center" : ""
                  }`}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {user?.email?.charAt(0).toUpperCase() ?? "U"}
                  </span>
                  {!collapsed && (
                    <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">
                      {user?.email ?? "用户"}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={collapsed ? "right" : "top"}
                align="start"
              >
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {user?.email ?? "用户"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDarkMode(!darkMode)}>
                  {darkMode ? "浅色模式" : "深色模式"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>退出登录</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(false)}
                    className="flex w-full items-center justify-center rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">展开侧边栏</TooltipContent>
              </Tooltip>
            ) : (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span>收起侧边栏</span>
              </button>
            )}
          </div>
        </div>

        <CreateSpaceDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </div>
    </TooltipProvider>
  );
}
