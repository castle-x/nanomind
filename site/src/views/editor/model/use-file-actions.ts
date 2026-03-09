import { useQueryClient } from "@tanstack/react-query";
import { createItem, deleteItem, getFileContent, renameItem } from "@/shared/lib/api-client";
import { markdownToHtml } from "@/shared/lib/markdown";
import { useAppStore } from "@/views/editor/model/editor-store";

/**
 * Hook that provides all file CRUD actions with proper state management.
 */
export function useFileActions() {
  const queryClient = useQueryClient();
  const store = useAppStore();

  /** Refresh file tree from API */
  const refreshTree = () => {
    queryClient.invalidateQueries({ queryKey: ["fileTree"] });
  };

  /** Open a file: check unsaved changes, load content, update state */
  const openFile = async (path: string) => {
    // Only warn about unsaved changes when actually in edit mode
    if (store.isEditing && store.hasChanges) {
      const ok = window.confirm("有未保存的更改，是否放弃？");
      if (!ok) return;
    }

    try {
      const res = await getFileContent(path);
      // Convert markdown → HTML for the Tiptap editor
      const html = markdownToHtml(res.content);
      store.setContent(html);
      store.setOriginalContent(res.content);
      store.setCurrentPath(path);
      store.setIsEditing(false);
      store.setHasChanges(false);
      store.addRecentFile(path);
    } catch (err) {
      console.error("Failed to load file:", err);
    }
  };

  /** Create a new file or directory */
  const create = async (parentPath: string, type: "file" | "directory", name: string) => {
    try {
      const res = await createItem({ path: parentPath, type, name });
      refreshTree();
      // Auto-open new file
      if (type === "file" && res.path) {
        await openFile(res.path);
      }
      return res;
    } catch (err) {
      console.error("Failed to create:", err);
      throw err;
    }
  };

  /** Delete a file or directory */
  const remove = async (path: string) => {
    const ok = window.confirm("确定要删除吗？此操作不可恢复。");
    if (!ok) return;

    try {
      await deleteItem(path);
      refreshTree();
      // If deleted the current file, clear editor
      if (store.currentPath === path) {
        store.setCurrentPath(null);
        store.setContent("");
        store.setOriginalContent("");
        store.setHasChanges(false);
        store.setIsEditing(false);
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  /** Rename a file or directory */
  const rename = async (oldPath: string, newName: string) => {
    try {
      const res = await renameItem(oldPath, newName);
      refreshTree();
      // If renamed the current file, update path
      if (store.currentPath === oldPath && res.path) {
        store.setCurrentPath(res.path);
      }
      return res;
    } catch (err) {
      console.error("Failed to rename:", err);
      throw err;
    }
  };

  return { openFile, create, remove, rename, refreshTree };
}
