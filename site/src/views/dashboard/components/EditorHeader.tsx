import { Pencil, Save, X } from "lucide-react";
import { useDashboardStore } from "@/views/dashboard/model/dashboard-store";

interface Props {
  spaceName: string;
  onSave: () => void;
  onToggleEdit: () => void;
  onCancelEdit: () => void;
}

export function EditorHeader({ spaceName, onSave, onToggleEdit, onCancelEdit }: Props) {
  const currentPath = useDashboardStore((s) => s.currentPath);
  const hasChanges = useDashboardStore((s) => s.hasChanges);
  const saving = useDashboardStore((s) => s.saving);
  const isEditing = useDashboardStore((s) => s.isEditing);

  const segments = currentPath ? currentPath.replace(/\.md$/, "").split("/") : null;

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="truncate text-muted-foreground">{spaceName}</span>
        {segments && (
          <>
            {segments.map((seg, i) => {
              const segmentPath = segments.slice(0, i + 1).join("/");
              return (
                <span
                  key={segmentPath}
                  className="flex items-center gap-1.5"
                >
                  <span className="text-muted-foreground/50">/</span>
                  <span
                    className={
                      i === segments.length - 1
                        ? "truncate font-medium"
                        : "truncate text-muted-foreground"
                    }
                  >
                    {seg}
                  </span>
                </span>
              );
            })}
            {hasChanges && (
              <span
                className="ml-1 h-2 w-2 shrink-0 rounded-full bg-destructive/80"
                title="未保存"
              />
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        {currentPath && !isEditing && (
          <button
            type="button"
            onClick={onToggleEdit}
            className="rounded-md p-1.5 transition-colors hover:bg-accent"
            title="编辑 (Ctrl+E)"
            aria-label="编辑"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}

        {currentPath && isEditing && (
          <>
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent"
              title="取消编辑 (Esc)"
              aria-label="取消编辑"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !hasChanges}
              className="rounded-md p-1.5 transition-colors hover:bg-accent disabled:opacity-40"
              title="保存 (Ctrl+S)"
              aria-label="保存"
            >
              <Save className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
