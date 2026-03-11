import { ArrowLeft, LogOut, Moon, Palette, Pencil, Save, Settings, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useThemeStore } from "@/shared/hooks/use-theme";
import { useAuth } from "@/shared/hooks/useAuth";
import { getAppInfo } from "@/shared/lib/api-client";
import type { ThemeKey } from "@/shared/types";
import { useAppStore } from "@/views/editor/model/editor-store";

const THEMES: { key: ThemeKey; label: string; color: string }[] = [
  { key: "A", label: "Arctic Frost", color: "#3b82f6" },
  { key: "B", label: "Minimalist", color: "#6b7280" },
  { key: "C", label: "Ocean", color: "#14b8a6" },
];

interface HeaderProps {
  onSave?: () => void;
  onToggleEdit?: () => void;
  onCancelEdit?: () => void;
}

export function Header({ onSave, onToggleEdit, onCancelEdit }: HeaderProps) {
  const currentPath = useAppStore((s) => s.currentPath);
  const hasChanges = useAppStore((s) => s.hasChanges);
  const saving = useAppStore((s) => s.saving);
  const isEditing = useAppStore((s) => s.isEditing);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const darkMode = useThemeStore((s) => s.darkMode);
  const setDarkMode = useThemeStore((s) => s.setDarkMode);
  const logout = useAuth((s) => s.logout);

  const [mindPath, setMindPath] = useState<string>("");

  useEffect(() => {
    getAppInfo()
      .then((info) => setMindPath(info.mindPath))
      .catch(() => {});
  }, []);

  // Breadcrumb — only the last segment matters
  const segments = currentPath ? currentPath.replace(/\.md$/, "").split("/") : null;

  return (
    <header className="h-11 border-b border-border flex items-center justify-between px-4 shrink-0">
      {/* Left: mind path + breadcrumb */}
      <div className="flex items-center gap-2 text-sm min-w-0">
        <Link
          to="/"
          className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title="返回文档首页"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-px h-4 bg-border/60 mx-1" />

        {mindPath && (
          <span
            className="text-muted-foreground/60 text-xs font-mono truncate"
            title={mindPath}
          >
            {mindPath}
          </span>
        )}
        {segments ? (
          <>
            {segments.map((seg, i) => {
              const segmentPath = segments.slice(0, i + 1).join("/");

              return (
                <span
                  key={segmentPath}
                  className="flex items-center gap-1.5"
                >
                  {i > 0 && <span className="text-muted-foreground/50">/</span>}
                  <span
                    className={
                      i === segments.length - 1
                        ? "font-medium truncate"
                        : "text-muted-foreground truncate"
                    }
                  >
                    {seg}
                  </span>
                </span>
              );
            })}
            {hasChanges && (
              <span
                className="w-2 h-2 rounded-full bg-destructive/80 shrink-0 ml-1"
                title="未保存"
              />
            )}
          </>
        ) : null}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-0.5">
        {/* Edit/Read mode toggle */}
        {currentPath && !isEditing && (
          <button
            type="button"
            onClick={onToggleEdit}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
            title="编辑 (⌘E)"
            aria-label="编辑"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}

        {currentPath && isEditing && (
          <>
            {/* Cancel edit */}
            <button
              type="button"
              onClick={onCancelEdit}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
              title="取消编辑 (Esc)"
              aria-label="取消编辑"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Save */}
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !hasChanges}
              className="p-1.5 rounded-md hover:bg-accent transition-colors disabled:opacity-40"
              title="保存 (⌘S)"
              aria-label="保存"
            >
              <Save className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Theme selector */}
        <div className="relative group">
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
            title="主题"
            aria-label="切换主题"
          >
            <Palette className="w-4 h-4" />
          </button>
          <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 animate-dropdown">
            {THEMES.map((t) => (
              <button
                type="button"
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  theme === t.key ? "bg-accent/60 font-medium" : ""
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <span className="flex-1 text-left">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 rounded-md hover:bg-accent transition-colors"
          title={darkMode ? "浅色模式" : "深色模式"}
          aria-label={darkMode ? "切换至浅色模式" : "切换至深色模式"}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Admin panel */}
        <button
          type="button"
          onClick={() => window.open("/_/", "_blank")}
          className="p-1.5 rounded-md hover:bg-accent transition-colors"
          title="管理面板"
          aria-label="管理面板"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={() => logout()}
          className="p-1.5 rounded-md hover:bg-accent transition-colors"
          title="退出登录"
          aria-label="退出登录"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
