import { BookOpen, FileText, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchFiles } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import type { FileTreeItem, SearchResult } from "@/shared/types";
import { useAppStore } from "@/views/editor/model/editor-store";

interface SearchDialogProps {
  onOpenFile: (path: string) => void;
}

/** Flatten file tree to a flat list of files */
function flattenFiles(items: FileTreeItem[]): { name: string; path: string }[] {
  const result: { name: string; path: string }[] = [];
  const walk = (nodes: FileTreeItem[]) => {
    for (const node of nodes) {
      if (node.type === "file") {
        result.push({ name: node.name, path: node.path });
      }
      if (node.children) walk(node.children);
    }
  };
  walk(items);
  return result;
}

export function SearchDialog({ onOpenFile }: SearchDialogProps) {
  const open = useAppStore((s) => s.searchOpen);
  const setOpen = useAppStore((s) => s.setSearchOpen);
  const files = useAppStore((s) => s.files);
  const recentOpened = useAppStore((s) => s.recentOpened);

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"filename" | "fulltext">("filename");
  const [activeIndex, setActiveIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flatFiles = useMemo(() => flattenFiles(files), [files]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filename search (local filter)
  const searchByFilename = useCallback(
    (q: string): SearchResult[] => {
      const lower = q.toLowerCase();
      return flatFiles
        .filter((f) => f.name.toLowerCase().includes(lower) || f.path.toLowerCase().includes(lower))
        .slice(0, 20)
        .map((f) => ({ name: f.name, path: f.path, matches: [] }));
    },
    [flatFiles],
  );

  // Perform search with debounce
  useEffect(() => {
    if (!open) return;

    if (query.length < 2) {
      setResults([]);
      setActiveIndex(0);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (mode === "filename") {
        setResults(searchByFilename(query));
        setActiveIndex(0);
      } else {
        // Full-text: merge filename results + API results
        setLoading(true);
        try {
          const filenameResults = searchByFilename(query);
          const apiResults = await searchFiles(query);

          // Merge: deduplicate by path
          const seen = new Set(filenameResults.map((r) => r.path));
          const merged = [...filenameResults];

          for (const r of apiResults) {
            if (seen.has(r.path)) {
              // Supplement existing result with matches
              const existing = merged.find((m) => m.path === r.path);
              if (existing && r.matches.length > 0) {
                existing.matches = r.matches;
              }
            } else {
              merged.push(r);
              seen.add(r.path);
            }
          }

          setResults(merged);
          setActiveIndex(0);
        } catch {
          // silently fail
        } finally {
          setLoading(false);
        }
      }
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [query, mode, open, searchByFilename]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % Math.max(results.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[activeIndex]) {
          onOpenFile(results[activeIndex].path);
          setOpen(false);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        setMode((m) => (m === "filename" ? "fulltext" : "filename"));
      }
    },
    [results, activeIndex, onOpenFile, setOpen],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] animate-fade-in">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        aria-label="关闭搜索"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-lg bg-popover border border-border rounded-xl shadow-2xl animate-dialog overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="搜索"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === "filename" ? "搜索文件..." : "全文搜索..."}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/50"
          />
          <button
            type="button"
            onClick={() => setMode((m) => (m === "filename" ? "fulltext" : "filename"))}
            className={cn(
              "p-1 rounded transition-colors",
              mode === "fulltext"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            title={`切换到${mode === "filename" ? "全文" : "文件名"}搜索 (⌘D)`}
          >
            {mode === "filename" ? (
              <FileText className="w-3.5 h-3.5" />
            ) : (
              <BookOpen className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recent files (when no query) */}
        {query.length < 2 && recentOpened.length > 0 && (
          <div className="px-4 py-2 border-b border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-1.5">
              最近打开
            </div>
            <div className="flex flex-wrap gap-1">
              {recentOpened.map((path) => (
                <button
                  type="button"
                  key={path}
                  onClick={() => {
                    onOpenFile(path);
                    setOpen(false);
                  }}
                  className="px-2 py-0.5 text-xs bg-accent rounded-full hover:bg-accent/80 transition-colors truncate max-w-[180px]"
                >
                  {path.replace(/\.md$/, "").split("/").pop()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="max-h-64 overflow-y-auto">
          {loading && (
            <div className="px-4 py-6 text-sm text-center text-muted-foreground">搜索中...</div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-6 text-sm text-center text-muted-foreground">无结果</div>
          )}

          {!loading &&
            results.map((r, i) => (
              <button
                type="button"
                key={r.path}
                onClick={() => {
                  onOpenFile(r.path);
                  setOpen(false);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "w-full text-left px-4 py-2 flex flex-col gap-0.5 transition-colors",
                  i === activeIndex ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <span className="text-sm font-medium truncate">{r.name}</span>
                <span className="text-xs text-muted-foreground truncate">{r.path}</span>
                {r.matches.length > 0 && (
                  <span className="text-xs text-muted-foreground/70 truncate">{r.matches[0]}</span>
                )}
              </button>
            ))}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-1.5 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground/50">
          <span>
            <kbd className="font-mono">↑↓</kbd> 选择
          </span>
          <span>
            <kbd className="font-mono">Enter</kbd> 打开
          </span>
          <span>
            <kbd className="font-mono">Esc</kbd> 关闭
          </span>
          <span>
            <kbd className="font-mono">⌘D</kbd> 切换模式
          </span>
        </div>
      </div>
    </div>
  );
}
