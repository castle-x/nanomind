import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/shared/hooks/useAuth";
import { getFileTree, getSetupStatus, saveFileContent } from "@/shared/lib/api-client";
import { htmlToMarkdown } from "@/shared/lib/markdown";
import { ChangePasswordDialog } from "@/views/editor/components/ChangePasswordDialog";
import { EmptyState } from "@/views/editor/components/EmptyState";
import { Header } from "@/views/editor/components/Header";
import { SearchDialog } from "@/views/editor/components/SearchDialog";
import { Sidebar } from "@/views/editor/components/Sidebar";
import { TableOfContents } from "@/views/editor/components/TableOfContents";
import { TiptapEditorLazy } from "@/views/editor/components/TiptapEditorLazy";
import { useAppStore } from "@/views/editor/model/editor-store";
import { useFileActions } from "@/views/editor/model/use-file-actions";

export function EditorView() {
  const navigate = useNavigate();
  const isAuthenticated = useAuth((s) => s.isAuthenticated);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);
  const setFiles = useAppStore((s) => s.setFiles);
  const currentPath = useAppStore((s) => s.currentPath);
  const content = useAppStore((s) => s.content);
  const setContent = useAppStore((s) => s.setContent);
  const setOriginalContent = useAppStore((s) => s.setOriginalContent);
  const hasChanges = useAppStore((s) => s.hasChanges);
  const setHasChanges = useAppStore((s) => s.setHasChanges);
  const saving = useAppStore((s) => s.saving);
  const setSaving = useAppStore((s) => s.setSaving);
  const isEditing = useAppStore((s) => s.isEditing);
  const setIsEditing = useAppStore((s) => s.setIsEditing);
  const searchOpen = useAppStore((s) => s.searchOpen);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    getSetupStatus()
      .then((status) => {
        if (status.needsPasswordChange) {
          setShowPasswordDialog(true);
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const { openFile } = useFileActions();
  const editorScrollRef = useRef<HTMLDivElement>(null);

  // Fetch file tree on mount
  const { data: files } = useQuery({
    queryKey: ["fileTree"],
    queryFn: getFileTree,
  });

  useEffect(() => {
    if (files) {
      setFiles(files);
    }
  }, [files, setFiles]);

  // Handle editor content change (HTML from Tiptap)
  // hasRealChanges: true only when content differs from the clean baseline
  const handleEditorUpdate = useCallback(
    (html: string, hasRealChanges: boolean) => {
      setContent(html);
      setHasChanges(hasRealChanges);
    },
    [setContent, setHasChanges],
  );

  // Save: convert HTML → MD, send to API
  const handleSave = useCallback(async () => {
    if (!currentPath || saving) return;
    setSaving(true);
    try {
      const markdown = htmlToMarkdown(content);
      await saveFileContent(currentPath, markdown);
      setOriginalContent(markdown);
      setHasChanges(false);
      setIsEditing(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [currentPath, saving, content, setSaving, setOriginalContent, setHasChanges, setIsEditing]);

  // Enter edit mode
  const handleToggleEdit = useCallback(() => {
    if (currentPath) {
      setIsEditing(true);
    }
  }, [currentPath, setIsEditing]);

  // Cancel edit mode
  const handleCancelEdit = useCallback(() => {
    if (hasChanges) {
      const ok = window.confirm("放弃修改？");
      if (!ok) return;
      // Revert to original: reload from original markdown
      // This is handled by resetting hasChanges; the content stays but user confirmed discard
      setHasChanges(false);
    }
    setIsEditing(false);
  }, [hasChanges, setIsEditing, setHasChanges]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      // Ctrl+S — Save
      if (mod && e.key === "s") {
        e.preventDefault();
        if (currentPath && hasChanges && !saving && isEditing) {
          handleSave();
        }
        return;
      }

      // Ctrl+K — Open search
      if (mod && e.key === "k") {
        e.preventDefault();
        setSearchOpen(!searchOpen);
        return;
      }

      // Ctrl+E — Toggle edit mode
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

      // Escape — Close search or cancel edit
      if (e.key === "Escape") {
        if (searchOpen) {
          setSearchOpen(false);
        } else if (isEditing) {
          handleCancelEdit();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    currentPath,
    hasChanges,
    saving,
    isEditing,
    searchOpen,
    handleSave,
    handleCancelEdit,
    setIsEditing,
    setSearchOpen,
  ]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Left sidebar — file tree */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <Header
          onSave={handleSave}
          onToggleEdit={handleToggleEdit}
          onCancelEdit={handleCancelEdit}
        />

        {/* Content area */}
        <main className="flex-1 overflow-hidden">
          {currentPath ? (
            <TiptapEditorLazy
              content={content}
              onUpdate={handleEditorUpdate}
              editable={isEditing}
              scrollContainerRef={editorScrollRef}
            />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>

      {/* Right sidebar — TOC */}
      <TableOfContents scrollContainerRef={editorScrollRef} />

      {/* Search dialog */}
      <SearchDialog onOpenFile={openFile} />

      {/* First-time setup: force password change */}
      <ChangePasswordDialog
        open={showPasswordDialog}
        onSuccess={() => setShowPasswordDialog(false)}
      />
    </div>
  );
}
