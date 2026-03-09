import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { useFileActions } from "@/views/editor/model/use-file-actions";

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentPath: string;
  type: "file" | "directory";
}

export function CreateDialog({ open, onOpenChange, parentPath, type }: CreateDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { create } = useFileActions();

  const isFile = type === "file";
  const title = isFile ? "新建文档" : "新建文件夹";
  const placeholder = isFile ? "文档名称" : "文件夹名称";

  useEffect(() => {
    if (open) {
      setName("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

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

    setLoading(true);
    setError("");
    try {
      await create(parentPath, type, trimmed);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "创建失败");
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* Name input */}
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
            placeholder={placeholder}
            className="flex-1 px-3 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40"
          />
          {isFile && <span className="pr-3 text-sm text-muted-foreground/40 select-none">.md</span>}
        </div>
        {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}

        {/* Actions */}
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
            {loading ? "创建中..." : "创建"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
