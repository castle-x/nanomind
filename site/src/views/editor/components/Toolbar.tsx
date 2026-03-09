import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  CodeSquare,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Redo,
  Strikethrough,
  Underline,
  Undo,
  Unlink,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";

interface ToolbarProps {
  editor: Editor;
}

/** Single toolbar button */
function ToolBtn({
  icon: Icon,
  active,
  disabled,
  onClick,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "p-1.5 rounded transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-foreground/60 hover:bg-accent hover:text-foreground",
        disabled && "opacity-30 pointer-events-none",
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

/** Separator */
function Sep() {
  return <div className="w-px h-5 bg-border mx-0.5" />;
}

export function Toolbar({ editor }: ToolbarProps) {
  const [linkInput, setLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (linkInput) {
      linkInputRef.current?.focus();
    }
  }, [linkInput]);

  const setLink = useCallback(() => {
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkInput(false);
      return;
    }
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  return (
    <div className="border-b border-border px-2 py-1 flex items-center gap-0.5 flex-wrap bg-card/50 shrink-0 sticky top-0 z-10">
      {/* Undo / Redo */}
      <ToolBtn
        icon={Undo}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="撤销"
      />
      <ToolBtn
        icon={Redo}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="重做"
      />

      <Sep />

      {/* Headings */}
      <ToolBtn
        icon={Heading1}
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="标题 1"
      />
      <ToolBtn
        icon={Heading2}
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="标题 2"
      />
      <ToolBtn
        icon={Heading3}
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="标题 3"
      />

      <Sep />

      {/* Text formatting */}
      <ToolBtn
        icon={Bold}
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="加粗 (⌘B)"
      />
      <ToolBtn
        icon={Italic}
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="斜体 (⌘I)"
      />
      <ToolBtn
        icon={Underline}
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="下划线 (⌘U)"
      />
      <ToolBtn
        icon={Strikethrough}
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="删除线"
      />
      <ToolBtn
        icon={Highlighter}
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="高亮"
      />

      <Sep />

      {/* Code */}
      <ToolBtn
        icon={Code}
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="行内代码"
      />
      <ToolBtn
        icon={CodeSquare}
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="代码块"
      />

      <Sep />

      {/* Lists */}
      <ToolBtn
        icon={ListOrdered}
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="有序列表"
      />
      <ToolBtn
        icon={List}
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="无序列表"
      />
      <ToolBtn
        icon={ListTodo}
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="任务列表"
      />

      <Sep />

      {/* Block elements */}
      <ToolBtn
        icon={Quote}
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="引用"
      />
      <ToolBtn
        icon={Minus}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="分隔线"
      />

      {/* Link */}
      <ToolBtn
        icon={editor.isActive("link") ? Unlink : Link}
        active={editor.isActive("link")}
        onClick={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
          } else {
            setLinkUrl("");
            setLinkInput(true);
          }
        }}
        title={editor.isActive("link") ? "取消链接" : "插入链接"}
      />

      {/* Link input popover */}
      {linkInput && (
        <div className="flex items-center gap-1 ml-1">
          <input
            ref={linkInputRef}
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setLink();
              if (e.key === "Escape") setLinkInput(false);
            }}
            placeholder="https://..."
            className="px-2 py-0.5 text-xs rounded border border-input bg-background outline-none focus:ring-1 focus:ring-ring w-48"
          />
          <button
            type="button"
            onClick={setLink}
            className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}
