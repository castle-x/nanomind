import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  return {
    toasts: [] as Toast[],
    dismiss: (_toastId?: string) => {},
  };
}

export function ToastProvider() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "min-w-[300px] rounded-lg border bg-background p-4 shadow-lg",
            t.variant === "destructive" && "border-destructive",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold">{t.title}</div>
              {t.description && (
                <div className="text-sm text-muted-foreground">{t.description}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
