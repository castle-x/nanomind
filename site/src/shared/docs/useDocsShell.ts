import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DocsContentMode } from "@/shared/types";

export const DOCS_SIDEBAR_DEFAULT_WIDTH = 280;
export const DOCS_SIDEBAR_MIN_WIDTH = 220;
export const DOCS_SIDEBAR_MAX_WIDTH = 420;

function clampSidebarWidth(width: number): number {
  return Math.min(DOCS_SIDEBAR_MAX_WIDTH, Math.max(DOCS_SIDEBAR_MIN_WIDTH, width));
}

interface DocsShellState {
  contentMode: DocsContentMode;
  contentModeCustomized: boolean;
  leftSidebarWidth: number;
  rightTocVisible: boolean;
  mobileSidebarOpen: boolean;
  isResizing: boolean;
  syncContentMode: (mode: DocsContentMode) => void;
  setContentMode: (mode: DocsContentMode) => void;
  toggleContentMode: () => void;
  setLeftSidebarWidth: (width: number) => void;
  setRightTocVisible: (visible: boolean) => void;
  toggleRightToc: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setIsResizing: (active: boolean) => void;
}

export const useDocsShell = create<DocsShellState>()(
  persist(
    (set, get) => ({
      contentMode: "centered",
      contentModeCustomized: false,
      leftSidebarWidth: DOCS_SIDEBAR_DEFAULT_WIDTH,
      rightTocVisible: true,
      mobileSidebarOpen: false,
      isResizing: false,
      syncContentMode: (contentMode) => {
        if (get().contentModeCustomized) {
          return;
        }

        set({ contentMode });
      },
      setContentMode: (contentMode) => set({ contentMode, contentModeCustomized: true }),
      toggleContentMode: () =>
        set((state) => ({
          contentMode: state.contentMode === "wide" ? "centered" : "wide",
          contentModeCustomized: true,
        })),
      setLeftSidebarWidth: (leftSidebarWidth) =>
        set({ leftSidebarWidth: clampSidebarWidth(leftSidebarWidth) }),
      setRightTocVisible: (rightTocVisible) => set({ rightTocVisible }),
      toggleRightToc: () => set((state) => ({ rightTocVisible: !state.rightTocVisible })),
      setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
      setIsResizing: (isResizing) => set({ isResizing }),
    }),
    {
      name: "docs-shell-preferences",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        contentMode: state.contentMode,
        contentModeCustomized: state.contentModeCustomized,
        leftSidebarWidth: state.leftSidebarWidth,
        rightTocVisible: state.rightTocVisible,
      }),
    },
  ),
);
