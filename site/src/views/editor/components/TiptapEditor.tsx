import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { useEffect, useRef } from "react";
import { looksLikeMarkdown, markdownToHtml } from "@/shared/lib/markdown";
import { Toolbar } from "./Toolbar";

const lowlight = createLowlight(common);

interface TiptapEditorProps {
  content: string;
  onUpdate: (html: string, hasRealChanges: boolean) => void;
  editable?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function TiptapEditor({
  content,
  onUpdate,
  editable = true,
  scrollContainerRef,
}: TiptapEditorProps) {
  const isUpdatingRef = useRef(false);
  const editorRef = useRef<Editor | null>(null);
  const cleanHtmlRef = useRef<string>("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // replaced by CodeBlockLowlight
        link: {
          openOnClick: !editable,
          HTMLAttributes: {
            class: "text-primary underline cursor-pointer",
          },
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: "开始编辑...",
      }),
      Highlight.configure({
        multicolor: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    editable,
    content,
    onUpdate: ({ editor: e }) => {
      if (!isUpdatingRef.current) {
        const html = e.getHTML();
        onUpdate(html, html !== cleanHtmlRef.current);
      }
    },
    editorProps: {
      attributes: {
        class: "tiptap-content outline-none min-h-full",
      },
      handlePaste: (_view, event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        // If clipboard already has HTML content, let Tiptap handle it natively
        const html = clipboardData.getData("text/html");
        if (html) return false;

        // Get plain text from clipboard
        const text = clipboardData.getData("text/plain");
        if (!text) return false;

        // Detect if the plain text is Markdown
        if (!looksLikeMarkdown(text)) return false;

        // Convert Markdown → HTML, insert via editor command
        event.preventDefault();
        const convertedHtml = markdownToHtml(text);
        editorRef.current?.commands.insertContent(convertedHtml);
        return true;
      },
    },
  });

  // Keep editor ref in sync for paste handler
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Sync content from outside (when loading new file)
  // After Tiptap normalizes the HTML, capture it as the "clean" baseline.
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      isUpdatingRef.current = true;
      editor.commands.setContent(content);
      requestAnimationFrame(() => {
        isUpdatingRef.current = false;
        cleanHtmlRef.current = editor.getHTML();
      });
    }
  }, [content, editor]);

  // Sync editable state
  // When leaving edit mode (save or cancel), update baseline BEFORE setEditable
  // so that the onUpdate triggered by setEditable sees matching content.
  useEffect(() => {
    if (editor) {
      if (!editable) {
        cleanHtmlRef.current = editor.getHTML();
      }
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar — only in edit mode */}
      {editor && editable && <Toolbar editor={editor} />}

      {/* Editor content — always render the container so scrollContainerRef is set for TOC */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4"
      >
        {editor && <EditorContent editor={editor} />}
      </div>
    </div>
  );
}
