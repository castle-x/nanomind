import { type ReactNode, useEffect } from "react";
import { DocsChannelBar } from "@/shared/docs/DocsChannelBar";
import { DocsContentFrame } from "@/shared/docs/DocsContentFrame";
import { DocsRightToc } from "@/shared/docs/DocsRightToc";
import { DocsSidebar } from "@/shared/docs/DocsSidebar";
import { DocsTopbar } from "@/shared/docs/DocsTopbar";
import { useDocsShell } from "@/shared/docs/useDocsShell";
import type { DocsConfig, DocsContentMode, DocsGroup, DocsTocItem } from "@/shared/types";

interface Props {
  config: DocsConfig;
  activeTabKey: string | null;
  groups: DocsGroup[];
  currentPageId: string;
  tocItems: DocsTocItem[];
  activeTocId: string | null;
  contentMode?: DocsContentMode;
  showToc?: boolean;
  children: ReactNode;
}

export function DocsShell({
  config,
  activeTabKey,
  groups,
  currentPageId,
  tocItems,
  activeTocId,
  contentMode,
  showToc = true,
  children,
}: Props) {
  const resolvedMode = useDocsShell((state) => state.contentMode);
  const leftSidebarWidth = useDocsShell((state) => state.leftSidebarWidth);
  const leftSidebarCollapsed = useDocsShell((state) => state.leftSidebarCollapsed);
  const rightTocVisible = useDocsShell((state) => state.rightTocVisible);
  const mobileSidebarOpen = useDocsShell((state) => state.mobileSidebarOpen);
  const isResizing = useDocsShell((state) => state.isResizing);
  const setContentMode = useDocsShell((state) => state.setContentMode);
  const setLeftSidebarWidth = useDocsShell((state) => state.setLeftSidebarWidth);
  const setLeftSidebarCollapsed = useDocsShell((state) => state.setLeftSidebarCollapsed);
  const setRightTocVisible = useDocsShell((state) => state.setRightTocVisible);
  const setMobileSidebarOpen = useDocsShell((state) => state.setMobileSidebarOpen);
  const setIsResizing = useDocsShell((state) => state.setIsResizing);

  useEffect(() => {
    if (contentMode) {
      setContentMode(contentMode);
    }
  }, [contentMode, setContentMode]);

  const currentMode = contentMode ?? resolvedMode;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocsTopbar
        config={config}
        contentMode={currentMode}
        leftSidebarCollapsed={leftSidebarCollapsed}
        rightTocVisible={rightTocVisible}
        onToggleContentMode={() => setContentMode(currentMode === "centered" ? "wide" : "centered")}
        onToggleLeftSidebar={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
        onToggleRightToc={() => setRightTocVisible(!rightTocVisible)}
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      />
      <DocsChannelBar
        config={config}
        activeTabKey={activeTabKey}
      />
      <div className="flex min-h-0 flex-1">
        <DocsSidebar
          groups={groups}
          currentPageId={currentPageId}
          homepage={config.site.homepage}
          width={leftSidebarWidth}
          collapsed={leftSidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          isResizing={isResizing}
          onResize={setLeftSidebarWidth}
          onResizeActiveChange={setIsResizing}
          onCollapse={setLeftSidebarCollapsed}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
        <main className="min-w-0 flex-1">
          <DocsContentFrame mode={currentMode}>{children}</DocsContentFrame>
        </main>
        <DocsRightToc
          items={tocItems}
          activeId={activeTocId}
          visible={showToc && rightTocVisible}
        />
      </div>
    </div>
  );
}
