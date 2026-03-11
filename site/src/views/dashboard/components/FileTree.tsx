import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Settings,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { useDashboardStore } from "@/views/dashboard/model/dashboard-store";
import { useDashboardFileActions } from "@/views/dashboard/model/use-dashboard-file-actions";
import { CreateFileDialog } from "./CreateFileDialog";

function countItems(items: FileTreeItem[]): { files: number; folders: number } {
  let files = 0;
  let folders = 0;
  for (const item of items) {
    if (item.type === "directory") {
      folders++;
      if (item.children) {
        const sub = countItems(item.children);
        files += sub.files;
        folders += sub.folders;
      }
    } else {
      files++;
    }
  }
  return { files, folders };
}

interface InlineRenameInputProps {
  initialName: string;
  isDirectory: boolean;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

function InlineRenameInput({
  initialName,
  isDirectory,
  onConfirm,
  onCancel,
}: InlineRenameInputProps) {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || /[\\/:*?"<>|]/.test(trimmed)) {
      onCancel();
      return;
    }
    if (trimmed === initialName) {
      onCancel();
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <span className="flex min-w-0 flex-1 items-center">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={handleSubmit}
        className="min-w-0 flex-1 rounded border border-input bg-background px-1 py-0 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
      {!isDirectory && (
        <span className="ml-0.5 select-none text-sm text-muted-foreground/40">.md</span>
      )}
    </span>
  );
}

export function FileTree() {
  const files = useDashboardStore((s) => s.files);
  const currentPath = useDashboardStore((s) => s.currentPath);
  const renamingPath = useDashboardStore((s) => s.renamingPath);
  const setRenamingPath = useDashboardStore((s) => s.setRenamingPath);
  const { openFile, remove, rename } = useDashboardFileActions();

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const paths = new Set<string>();
    for (const f of files) {
      if (f.type === "directory") paths.add(f.path);
    }
    return paths;
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createParent, setCreateParent] = useState("");
  const [createType, setCreateType] = useState<"file" | "directory">("file");

  // Auto-expand to show selected file
  useEffect(() => {
    if (!currentPath) return;
    const parts = currentPath.split("/");
    if (parts.length > 1) {
      setExpanded((prev) => {
        const next = new Set(prev);
        for (let i = 1; i < parts.length; i++) {
          next.add(parts.slice(0, i).join("/"));
        }
        return next;
      });
    }
  }, [currentPath]);

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
    setRenamingPath(item.path);
  };

  const handleRenameConfirm = async (path: string, newName: string) => {
    try {
      await rename(path, newName);
    } catch {
      // rename error already logged in hook
    }
    setRenamingPath(null);
  };

  const handleRenameCancel = () => {
    setRenamingPath(null);
  };

  const handleDelete = (item: FileTreeItem) => {
    remove(item.path);
  };

  const { files: fileCount, folders: folderCount } = countItems(files);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs text-muted-foreground/60">
          {fileCount > 0 && <>文档 {fileCount}</>}
          {fileCount > 0 && folderCount > 0 && " · "}
          {folderCount > 0 && <>文件夹 {folderCount}</>}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
              title="新建"
              aria-label="新建文档或文件夹"
            >
              <Plus className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-32"
          >
            <DropdownMenuItem onClick={() => handleNewFile("")}>
              <FileText className="mr-2 h-3.5 w-3.5 opacity-50" />
              新建文档
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNewFolder("")}>
              <Folder className="mr-2 h-3.5 w-3.5 opacity-50" />
              新建文件夹
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex-1 overflow-y-auto py-1">
            {files.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <button
                  type="button"
                  onClick={() => handleNewFile("")}
                  className="text-sm text-primary/70 transition-colors hover:text-primary"
                >
                  + 创建第一个文档
                </button>
              </div>
            ) : (
              <FileTreeNodes
                items={files}
                depth={0}
                currentPath={currentPath}
                expanded={expanded}
                renamingPath={renamingPath}
                onToggle={toggleExpand}
                onSelect={openFile}
                onRename={handleRename}
                onRenameConfirm={handleRenameConfirm}
                onRenameCancel={handleRenameCancel}
                onDelete={handleDelete}
                onNewFile={handleNewFile}
                onNewFolder={handleNewFolder}
              />
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => handleNewFile("")}>新建文档</ContextMenuItem>
          <ContextMenuItem onClick={() => handleNewFolder("")}>新建文件夹</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <CreateFileDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        parentPath={createParent}
        type={createType}
      />
    </div>
  );
}

interface FileTreeNodesProps {
  items: FileTreeItem[];
  depth: number;
  currentPath: string | null;
  expanded: Set<string>;
  renamingPath: string | null;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onRename: (item: FileTreeItem) => void;
  onRenameConfirm: (path: string, newName: string) => void;
  onRenameCancel: () => void;
  onDelete: (item: FileTreeItem) => void;
  onNewFile: (parent: string) => void;
  onNewFolder: (parent: string) => void;
}

function FileTreeNodes({
  items,
  depth,
  currentPath,
  expanded,
  renamingPath,
  onToggle,
  onSelect,
  onRename,
  onRenameConfirm,
  onRenameCancel,
  onDelete,
  onNewFile,
  onNewFolder,
}: FileTreeNodesProps) {
  const sorted = [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      {sorted.map((item) => {
        const paddingLeft = 12 + depth * 16;
        const isRenaming = renamingPath === item.path;

        if (item.type === "directory") {
          const isExpanded = expanded.has(item.path);
          return (
            <div
              key={item.path}
              role="none"
              onContextMenu={(e) => e.stopPropagation()}
            >
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={() => onToggle(item.path)}
                      className="flex w-full items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                      style={{ paddingLeft }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                      )}
                      {isExpanded ? (
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                      ) : (
                        <Folder className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                      )}
                      {isRenaming ? (
                        <InlineRenameInput
                          initialName={item.name}
                          isDirectory
                          onConfirm={(name) => onRenameConfirm(item.path, name)}
                          onCancel={onRenameCancel}
                        />
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-left">{item.name}</span>
                      )}
                    </button>
                    {!isRenaming && (
                      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="rounded p-0.5 text-muted-foreground/60 hover:bg-accent hover:text-foreground"
                              aria-label="新建"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            className="w-32"
                          >
                            <DropdownMenuItem onClick={() => onNewFile(item.path)}>
                              <FileText className="mr-2 h-3.5 w-3.5 opacity-50" />
                              新建文档
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onNewFolder(item.path)}>
                              <Folder className="mr-2 h-3.5 w-3.5 opacity-50" />
                              新建文件夹
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Settings placeholder
                          }}
                          className="rounded p-0.5 text-muted-foreground/60 hover:bg-accent hover:text-foreground"
                          aria-label="设置"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => onNewFile(item.path)}>新建文档</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => {
                      // Settings placeholder
                    }}
                  >
                    设置
                  </ContextMenuItem>
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
                <FileTreeNodes
                  items={item.children}
                  depth={depth + 1}
                  currentPath={currentPath}
                  expanded={expanded}
                  renamingPath={renamingPath}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  onRename={onRename}
                  onRenameConfirm={onRenameConfirm}
                  onRenameCancel={onRenameCancel}
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
          <div
            key={item.path}
            role="none"
            onContextMenu={(e) => e.stopPropagation()}
          >
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => !isRenaming && onSelect(item.path)}
                    className={`flex w-full items-center gap-1.5 px-2 py-1 text-sm transition-colors ${
                      isActive
                        ? "bg-primary/8 font-medium text-primary"
                        : "text-foreground/80 hover:bg-accent/60"
                    }`}
                    style={{ paddingLeft: paddingLeft + 16 }}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 opacity-40" />
                    {isRenaming ? (
                      <InlineRenameInput
                        initialName={item.name}
                        isDirectory={false}
                        onConfirm={(name) => onRenameConfirm(item.path, name)}
                        onCancel={onRenameCancel}
                      />
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-left">{item.name}</span>
                    )}
                  </button>
                  {!isRenaming && (
                    <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Settings placeholder
                        }}
                        className="rounded p-0.5 text-muted-foreground/60 hover:bg-accent hover:text-foreground"
                        aria-label="设置"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onClick={() => {
                    // Settings placeholder
                  }}
                >
                  设置
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onRename(item)}>重命名</ContextMenuItem>
                <ContextMenuItem
                  destructive
                  onClick={() => onDelete(item)}
                >
                  删除
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        );
      })}
    </div>
  );
}
