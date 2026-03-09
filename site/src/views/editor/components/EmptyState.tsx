import { FileText } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-2 text-muted-foreground/50">
        <FileText className="w-5 h-5" />
        <span className="text-sm">选择或新建文档</span>
      </div>
    </div>
  );
}
