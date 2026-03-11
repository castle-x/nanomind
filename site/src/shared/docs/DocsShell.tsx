import { type ReactNode, useEffect } from "react";
import { DocsChannelBar } from "@/shared/docs/DocsChannelBar";
import { DocsContentFrame } from "@/shared/docs/DocsContentFrame";
import { DocsRightToc } from "@/shared/docs/DocsRightToc";
import { DocsSidebar } from "@/shared/docs/DocsSidebar";
import { DocsTopbar } from "@/shared/docs/DocsTopbar";
import { useDocsShell } from "@/shared/docs/useDocsShell";
import type { DocsConfig, DocsContentMode, DocsGroup, TocItem } from "@/shared/types";

interface Props {
  config: DocsConfig;
  activeTabKey: string | null;
  groups: DocsGroup[];
  currentPageId: string;
  tocItems: TocItem[];
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
  const mobileSidebarOpen = useDocsShell((state) => state.mobileSidebarOpen);
  const setContentMode = useDocsShell((state) => state.setContentMode);
  const setMobileSidebarOpen = useDocsShell((state) => state.setMobileSidebarOpen);

  useEffect(() => {
    if (contentMode) {
      setContentMode(contentMode);
    }
  }, [contentMode, setContentMode]);

  const currentMode = contentMode ?? resolvedMode;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[90%] xl:max-w-[70%] 2xl:max-w-[1600px]">
        <DocsTopbar
          config={config}
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
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
          <main className="min-w-0 flex-1">
            <DocsContentFrame mode={currentMode}>{children}</DocsContentFrame>
          </main>
          <DocsRightToc
            items={tocItems}
            activeId={activeTocId}
            visible={showToc}
          />
        </div>
      </div>
    </div>
  );
}
