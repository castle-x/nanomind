import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { useParams } from "react-router";
import { getFileTree, listSpaces, saveFileContent } from "@/shared/lib/api-client";
import { htmlToMarkdown } from "@/shared/lib/markdown";
import { useDashboardStore } from "@/views/dashboard/model/dashboard-store";
import { TiptapEditorLazy } from "@/views/editor/components/TiptapEditorLazy";
import { AppSidebar } from "./components/AppSidebar";
import { EditorHeader } from "./components/EditorHeader";
import { FileNavPanel } from "./components/FileNavPanel";
import { OnPageNav } from "./components/OnPageNav";

export function DashboardView() {
  const { spaceId } = useParams<{ spaceId?: string }>();
  const currentSpaceId = useDashboardStore((s) => s.currentSpaceId);
  const setCurrentSpaceId = useDashboardStore((s) => s.setCurrentSpaceId);
  const setFiles = useDashboardStore((s) => s.setFiles);
  const currentPath = useDashboardStore((s) => s.currentPath);
  const content = useDashboardStore((s) => s.content);
  const setContent = useDashboardStore((s) => s.setContent);
  const setOriginalContent = useDashboardStore((s) => s.setOriginalContent);
  const hasChanges = useDashboardStore((s) => s.hasChanges);
  const setHasChanges = useDashboardStore((s) => s.setHasChanges);
  const saving = useDashboardStore((s) => s.saving);
  const setSaving = useDashboardStore((s) => s.setSaving);
  const isEditing = useDashboardStore((s) => s.isEditing);
  const setIsEditing = useDashboardStore((s) => s.setIsEditing);
  const activeSection = useDashboardStore((s) => s.activeSection);

  const editorScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (spaceId) {
      setCurrentSpaceId(spaceId);
    }
  }, [spaceId, setCurrentSpaceId]);

  // Fetch file tree for current space
  const { data: files } = useQuery({
    queryKey: ["fileTree", currentSpaceId],
    queryFn: () => getFileTree(currentSpaceId as string),
    enabled: !!currentSpaceId,
  });

  useEffect(() => {
    if (files) {
      setFiles(files);
    }
  }, [files, setFiles]);

  // Get current space name
  const { data: spaces = [] } = useQuery({
    queryKey: ["spaces"],
    queryFn: listSpaces,
  });
  const currentSpace = spaces.find((s) => s.id === currentSpaceId);
  const spaceName = currentSpace?.name ?? "";

  // Editor update handler
  const handleEditorUpdate = useCallback(
    (html: string, hasRealChanges: boolean) => {
      setContent(html);
      setHasChanges(hasRealChanges);
    },
    [setContent, setHasChanges],
  );

  // Save
  const handleSave = useCallback(async () => {
    if (!currentPath || !currentSpaceId || saving) return;
    setSaving(true);
    try {
      const markdown = htmlToMarkdown(content);
      await saveFileContent(currentSpaceId, currentPath, markdown);
      setOriginalContent(markdown);
      setHasChanges(false);
      setIsEditing(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [
    currentPath,
    currentSpaceId,
    saving,
    content,
    setSaving,
    setOriginalContent,
    setHasChanges,
    setIsEditing,
  ]);

  // Toggle edit
  const handleToggleEdit = useCallback(() => {
    if (currentPath) {
      setIsEditing(true);
    }
  }, [currentPath, setIsEditing]);

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    if (hasChanges) {
      const ok = window.confirm("放弃修改？");
      if (!ok) return;
      setHasChanges(false);
    }
    setIsEditing(false);
  }, [hasChanges, setIsEditing, setHasChanges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === "s") {
        e.preventDefault();
        if (currentPath && hasChanges && !saving && isEditing) {
          handleSave();
        }
        return;
      }

      if (mod && e.key === "e") {
        e.preventDefault();
        if (currentPath) {
          if (isEditing) {
            handleCancelEdit();
          } else {
            setIsEditing(true);
          }
        }
        return;
      }

      if (e.key === "Escape" && isEditing) {
        handleCancelEdit();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentPath, hasChanges, saving, isEditing, handleSave, handleCancelEdit, setIsEditing]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <AppSidebar />
      {currentSpaceId ? (
        <>
          {activeSection === "editor" && (
            <>
              <FileNavPanel />
              <div className="flex min-w-0 flex-1 flex-col">
                <EditorHeader
                  spaceName={spaceName}
                  onSave={handleSave}
                  onToggleEdit={handleToggleEdit}
                  onCancelEdit={handleCancelEdit}
                />
                <main className="flex-1 overflow-hidden">
                  {currentPath ? (
                    <TiptapEditorLazy
                      content={content}
                      onUpdate={handleEditorUpdate}
                      editable={isEditing}
                      scrollContainerRef={editorScrollRef}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      选择文件开始编辑
                    </div>
                  )}
                </main>
              </div>
              <OnPageNav scrollContainerRef={editorScrollRef} />
            </>
          )}
          {activeSection === "home" && (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              主页（即将推出）
            </div>
          )}
          {activeSection === "settings" && (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              设置（即将推出）
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          选择或创建一个空间
        </div>
      )}
    </div>
  );
}
