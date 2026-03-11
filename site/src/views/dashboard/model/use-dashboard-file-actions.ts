import { useQueryClient } from "@tanstack/react-query";
import { createItem, deleteItem, getFileContent, renameItem } from "@/shared/lib/api-client";
import { markdownToHtml } from "@/shared/lib/markdown";
import { useDashboardStore } from "@/views/dashboard/model/dashboard-store";

/**
 * Hook that provides file CRUD actions for the dashboard editor.
 * Adapted from views/editor/model/use-file-actions.ts for dashboard context.
 */
export function useDashboardFileActions() {
  const queryClient = useQueryClient();
  const store = useDashboardStore();

  const refreshTree = () => {
    queryClient.invalidateQueries({ queryKey: ["fileTree", store.currentSpaceId] });
  };

  const openFile = async (path: string) => {
    const spaceId = store.currentSpaceId;
    if (!spaceId) return;

    if (store.isEditing && store.hasChanges) {
      const ok = window.confirm("有未保存的更改，是否放弃？");
      if (!ok) return;
    }

    try {
      const res = await getFileContent(spaceId, path);
      const html = markdownToHtml(res.content);
      store.setContent(html);
      store.setOriginalContent(res.content);
      store.setCurrentPath(path);
      store.setCurrentFileId(path);
      store.setIsEditing(false);
      store.setHasChanges(false);
    } catch (err) {
      console.error("Failed to load file:", err);
    }
  };

  const create = async (parentPath: string, type: "file" | "directory", name: string) => {
    const spaceId = store.currentSpaceId;
    if (!spaceId) return;

    try {
      const res = await createItem({ spaceId, path: parentPath, type, name });
      refreshTree();
      if (type === "file" && res.path) {
        await openFile(res.path);
      }
      return res;
    } catch (err) {
      console.error("Failed to create:", err);
      throw err;
    }
  };

  const remove = async (path: string) => {
    const spaceId = store.currentSpaceId;
    if (!spaceId) return;

    const ok = window.confirm("确定要删除吗？此操作不可恢复。");
    if (!ok) return;

    try {
      await deleteItem(spaceId, path);
      refreshTree();
      if (store.currentPath === path) {
        store.setCurrentPath(null);
        store.setCurrentFileId(null);
        store.setContent("");
        store.setOriginalContent("");
        store.setHasChanges(false);
        store.setIsEditing(false);
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const rename = async (oldPath: string, newName: string) => {
    const spaceId = store.currentSpaceId;
    if (!spaceId) return;

    try {
      const res = await renameItem(spaceId, oldPath, newName);
      refreshTree();
      if (store.currentPath === oldPath && res.path) {
        store.setCurrentPath(res.path);
        store.setCurrentFileId(res.path);
      }
      return res;
    } catch (err) {
      console.error("Failed to rename:", err);
      throw err;
    }
  };

  return { openFile, create, remove, rename, refreshTree };
}
