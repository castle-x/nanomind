import { create } from "zustand";
import type { FileTreeItem, TocItem } from "@/shared/types";

interface DashboardState {
  // Space
  currentSpaceId: string | null;
  setCurrentSpaceId: (id: string | null) => void;

  // Navigation mode
  navMode: "navigation" | "files";
  setNavMode: (mode: "navigation" | "files") => void;

  // Active section
  activeSection: "home" | "editor" | "settings";
  setActiveSection: (section: "home" | "editor" | "settings") => void;

  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Inline rename
  renamingPath: string | null;
  setRenamingPath: (path: string | null) => void;

  // File tree
  files: FileTreeItem[];
  setFiles: (files: FileTreeItem[]) => void;

  // Current file
  currentFileId: string | null;
  setCurrentFileId: (id: string | null) => void;
  currentPath: string | null;
  setCurrentPath: (path: string | null) => void;

  // Editor content
  content: string;
  setContent: (content: string) => void;
  originalContent: string;
  setOriginalContent: (content: string) => void;

  // Edit state
  hasChanges: boolean;
  setHasChanges: (has: boolean) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;

  // TOC
  tocItems: TocItem[];
  setTocItems: (items: TocItem[]) => void;
  activeTocId: string | null;
  setActiveTocId: (id: string | null) => void;

  // Search
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  // Space
  currentSpaceId: null,
  setCurrentSpaceId: (currentSpaceId) => set({ currentSpaceId }),

  // Navigation mode
  navMode: "files",
  setNavMode: (navMode) => set({ navMode }),

  // Active section
  activeSection: "editor",
  setActiveSection: (activeSection) => set({ activeSection }),

  // Sidebar
  sidebarCollapsed: false,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

  // Inline rename
  renamingPath: null,
  setRenamingPath: (renamingPath) => set({ renamingPath }),

  // File tree
  files: [],
  setFiles: (files) => set({ files }),

  // Current file
  currentFileId: null,
  setCurrentFileId: (currentFileId) => set({ currentFileId }),
  currentPath: null,
  setCurrentPath: (currentPath) => set({ currentPath }),

  // Editor content
  content: "",
  setContent: (content) => set({ content }),
  originalContent: "",
  setOriginalContent: (originalContent) => set({ originalContent }),

  // Edit state
  hasChanges: false,
  setHasChanges: (hasChanges) => set({ hasChanges }),
  isEditing: false,
  setIsEditing: (isEditing) => set({ isEditing }),
  saving: false,
  setSaving: (saving) => set({ saving }),

  // TOC
  tocItems: [],
  setTocItems: (tocItems) => set({ tocItems }),
  activeTocId: null,
  setActiveTocId: (activeTocId) => set({ activeTocId }),

  // Search
  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
}));
