import { create } from "zustand";
import type { FileTreeItem, SearchResult, TocItem } from "@/shared/types";

interface AppState {
  // File tree
  files: FileTreeItem[];
  setFiles: (files: FileTreeItem[]) => void;

  // Current file
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

  // Sidebar search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  setSearchResults: (results: SearchResult[]) => void;

  // Search dialog
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  searchMode: "filename" | "fulltext";
  setSearchMode: (mode: "filename" | "fulltext") => void;
  searchDialogQuery: string;
  setSearchDialogQuery: (query: string) => void;
  searchDialogResults: SearchResult[];
  setSearchDialogResults: (results: SearchResult[]) => void;
  searchActiveIndex: number;
  setSearchActiveIndex: (index: number) => void;

  // Recent files
  recentOpened: string[];
  addRecentFile: (path: string) => void;

  // Modals
  cancelConfirmOpen: boolean;
  setCancelConfirmOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // File tree
  files: [],
  setFiles: (files) => set({ files }),

  // Current file
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

  // Sidebar search
  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  searchResults: [],
  setSearchResults: (searchResults) => set({ searchResults }),

  // Search dialog
  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  searchMode: "filename",
  setSearchMode: (searchMode) => set({ searchMode }),
  searchDialogQuery: "",
  setSearchDialogQuery: (searchDialogQuery) => set({ searchDialogQuery }),
  searchDialogResults: [],
  setSearchDialogResults: (searchDialogResults) => set({ searchDialogResults }),
  searchActiveIndex: -1,
  setSearchActiveIndex: (searchActiveIndex) => set({ searchActiveIndex }),

  // Recent files
  recentOpened: [],
  addRecentFile: (path) =>
    set((state) => {
      const filtered = state.recentOpened.filter((p) => p !== path);
      return { recentOpened: [path, ...filtered].slice(0, 5) };
    }),

  // Modals
  cancelConfirmOpen: false,
  setCancelConfirmOpen: (cancelConfirmOpen) => set({ cancelConfirmOpen }),
}));
