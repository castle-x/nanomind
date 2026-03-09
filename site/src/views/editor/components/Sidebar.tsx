import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Search,
} from "lucide-react";
import { useCallback, useState } from "react";
import type { FileTreeItem } from "@/shared/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/shared/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useAppStore } from "@/views/editor/model/editor-store";
import { useFileActions } from "@/views/editor/model/use-file-actions";
import { CreateDialog } from "./CreateDialog";
import { RenameDialog } from "./RenameDialog";

interface RenameTarget {
  path: string;
  name: string;
  isDirectory: boolean;
}

export function Sidebar() {
  const files = useAppStore((s) => s.files);
  const currentPath = useAppStore((s) => s.currentPath);
  const { openFile, remove } = useFileActions();

  // Expand/collapse state
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const paths = new Set<string>();
    for (const f of files) {
      if (f.type === "directory") paths.add(f.path);
    }
    return paths;
  });

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [createParent, setCreateParent] = useState("");
  const [createType, setCreateType] = useState<"file" | "directory">("file");
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);

  const handleNewFile = (parent: string) => {
    setCreateParent(parent);
    setCreateType("file");
    setCreateOpen(true);
  };
  const handleNewFolder = (parent: string) => {
    setCreateParent(parent);
    setCreateType("directory");
    setCreateOpen(true);
  };

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleRename = (item: FileTreeItem) => {
    setRenameTarget({
      path: item.path,
      name: item.name + (item.type === "file" ? ".md" : ""),
      isDirectory: item.type === "directory",
    });
  };

  const handleDelete = (item: FileTreeItem) => {
    remove(item.path);
  };

  return (
    <aside className="w-64 border-r border-border flex flex-col bg-sidebar shrink-0">
      {/* Search + new button */}
      <div className="h-11 px-3 flex items-center gap-2 border-b border-border">
        <Search className="w-3.5 h-3.5 text-muted-foreground/60" />
        <input
          type="text"
          placeholder="搜索..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
        />
        <kbd className="text-[10px] text-muted-foreground/50 bg-muted px-1 py-0.5 rounded">⌘K</kbd>
        <DropdownMenu
          open={undefined}
          onOpenChange={undefined}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground/60 hover:text-foreground"
              title="新建"
              aria-label="新建文档或文件夹"
            >
              <Plus className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-32"
          >
            <DropdownMenuItem onClick={() => handleNewFile("")}>
              <FileText className="w-3.5 h-3.5 mr-2 opacity-50" />
              新建文档
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNewFolder("")}>
              <Folder className="w-3.5 h-3.5 mr-2 opacity-50" />
              新建文件夹
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {files.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <button
              type="button"
              onClick={() => handleNewFile("")}
              className="text-sm text-primary/70 hover:text-primary transition-colors"
            >
              + 创建第一个文档
            </button>
          </div>
        ) : (
          <FileTree
            items={files}
            depth={0}
            currentPath={currentPath}
            expanded={expanded}
            onToggle={toggleExpand}
            onSelect={openFile}
            onRename={handleRename}
            onDelete={handleDelete}
            onNewFile={handleNewFile}
            onNewFolder={handleNewFolder}
          />
        )}
      </div>

      {/* Create dialog */}
      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        parentPath={createParent}
        type={createType}
      />

      {/* Rename dialog */}
      <RenameDialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        currentPath={renameTarget?.path ?? ""}
        currentName={renameTarget?.name ?? ""}
        isDirectory={renameTarget?.isDirectory ?? false}
      />
    </aside>
  );
}

/** Recursive file tree renderer */
function FileTree({
  items,
  depth,
  currentPath,
  expanded,
  onToggle,
  onSelect,
  onRename,
  onDelete,
  onNewFile,
  onNewFolder,
}: {
  items: FileTreeItem[];
  depth: number;
  currentPath: string | null;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onRename: (item: FileTreeItem) => void;
  onDelete: (item: FileTreeItem) => void;
  onNewFile: (parent: string) => void;
  onNewFolder: (parent: string) => void;
}) {
  const sorted = [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      {sorted.map((item) => {
        const paddingLeft = 12 + depth * 16;

        if (item.type === "directory") {
          const isExpanded = expanded.has(item.path);
          return (
            <div key={item.path}>
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onToggle(item.path)}
                    className="w-full flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
                    style={{ paddingLeft }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
                    ) : (
                      <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />
                    )}
                    {isExpanded ? (
                      <FolderOpen className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                    )}
                    <span className="truncate">{item.name}</span>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => onNewFile(item.path)}>新建文档</ContextMenuItem>
                  <ContextMenuItem onClick={() => onNewFolder(item.path)}>
                    新建文件夹
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => onRename(item)}>重命名</ContextMenuItem>
                  <ContextMenuItem
                    destructive
                    onClick={() => onDelete(item)}
                  >
                    删除
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
              {isExpanded && item.children && (
                <FileTree
                  items={item.children}
                  depth={depth + 1}
                  currentPath={currentPath}
                  expanded={expanded}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  onRename={onRename}
                  onDelete={onDelete}
                  onNewFile={onNewFile}
                  onNewFolder={onNewFolder}
                />
              )}
            </div>
          );
        }

        const isActive = currentPath === item.path;
        return (
          <ContextMenu key={item.path}>
            <ContextMenuTrigger asChild>
              <button
                type="button"
                onClick={() => onSelect(item.path)}
                className={`w-full flex items-center gap-1.5 px-2 py-1 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/8 text-primary font-medium"
                    : "text-foreground/80 hover:bg-accent/60"
                }`}
                style={{ paddingLeft: paddingLeft + 16 }}
              >
                <FileText className="w-3.5 h-3.5 shrink-0 opacity-40" />
                <span className="truncate">{item.name}</span>
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onRename(item)}>重命名</ContextMenuItem>
              <ContextMenuItem
                destructive
                onClick={() => onDelete(item)}
              >
                删除
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}
