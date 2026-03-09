import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { useFileActions } from "@/views/editor/model/use-file-actions";

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  currentName: string;
  isDirectory: boolean;
}

export function RenameDialog({
  open,
  onOpenChange,
  currentPath,
  currentName,
  isDirectory,
}: RenameDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { rename } = useFileActions();

  useEffect(() => {
    if (open) {
      setName(isDirectory ? currentName : currentName.replace(/\.md$/, ""));
      setError("");
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open, currentName, isDirectory]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("名称不能为空");
      return;
    }
    if (/[\\/:*?"<>|]/.test(trimmed)) {
      setError("名称包含非法字符");
      return;
    }
    const newName = trimmed;
    const compareName = isDirectory ? currentName : currentName.replace(/\.md$/, "");
    if (newName === compareName) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await rename(currentPath, newName);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "重命名失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-0 border border-input rounded-md focus-within:ring-2 focus-within:ring-ring">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder="输入新名称"
            className="flex-1 px-3 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40"
          />
          {!isDirectory && (
            <span className="pr-3 text-sm text-muted-foreground/40 select-none">.md</span>
          )}
        </div>
        {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-muted-foreground"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "保存中..." : "确认"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
