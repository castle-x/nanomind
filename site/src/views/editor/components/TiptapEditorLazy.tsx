import { lazy, Suspense } from "react";

const TiptapEditor = lazy(() =>
  import("@/views/editor/components/TiptapEditor").then((m) => ({
    default: m.TiptapEditor,
  })),
);

interface TiptapEditorLazyProps {
  content: string;
  onUpdate: (html: string, hasRealChanges: boolean) => void;
  editable?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function TiptapEditorLazy(props: TiptapEditorLazyProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <span className="text-muted-foreground">加载编辑器...</span>
        </div>
      }
    >
      <TiptapEditor {...props} />
    </Suspense>
  );
}
