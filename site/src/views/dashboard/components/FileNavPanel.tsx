import { useDashboardStore } from "@/views/dashboard/model/dashboard-store";
import { FileTree } from "./FileTree";

export function FileNavPanel() {
  const navMode = useDashboardStore((s) => s.navMode);
  const setNavMode = useDashboardStore((s) => s.setNavMode);

  return (
    <div className="flex h-full w-[240px] flex-col border-r border-border bg-background">
      <div className="flex border-b border-border">
        <button
          type="button"
          className={`flex-1 px-3 py-2 text-sm transition-colors ${
            navMode === "navigation"
              ? "border-b-2 border-foreground font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setNavMode("navigation")}
        >
          导航
        </button>
        <button
          type="button"
          className={`flex-1 px-3 py-2 text-sm transition-colors ${
            navMode === "files"
              ? "border-b-2 border-foreground font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setNavMode("files")}
        >
          文件
        </button>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        {navMode === "files" ? (
          <FileTree />
        ) : (
          <div className="flex-1 p-3 text-sm text-muted-foreground">导航树即将推出...</div>
        )}
      </div>
    </div>
  );
}
