"use client";

import { useEffect } from "react";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, LinkIcon, List, ListOrdered, UnderlineIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder: placeholder || "Nhập nội dung..." }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "min-h-32 px-3 py-3 text-sm leading-6 outline-none [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-muted-foreground [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Nhập đường dẫn", previous || "https://");
    if (href === null) return;
    if (!href) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-background focus-within:ring-3 focus-within:ring-ring/20">
      <div className="flex flex-wrap gap-1 border-b bg-muted/40 p-2">
        {[
          { label: "In đậm", icon: Bold, active: editor.isActive("bold"), action: () => editor.chain().focus().toggleBold().run() },
          { label: "In nghiêng", icon: Italic, active: editor.isActive("italic"), action: () => editor.chain().focus().toggleItalic().run() },
          { label: "Gạch chân", icon: UnderlineIcon, active: editor.isActive("underline"), action: () => editor.chain().focus().toggleUnderline().run() },
          { label: "Danh sách", icon: List, active: editor.isActive("bulletList"), action: () => editor.chain().focus().toggleBulletList().run() },
          { label: "Danh sách số", icon: ListOrdered, active: editor.isActive("orderedList"), action: () => editor.chain().focus().toggleOrderedList().run() },
          { label: "Liên kết", icon: LinkIcon, active: editor.isActive("link"), action: setLink },
        ].map((item) => (
          <Button
            key={item.label}
            type="button"
            variant="ghost"
            size="icon-sm"
            title={item.label}
            aria-label={item.label}
            className={cn(item.active && "bg-accent text-accent-foreground")}
            onClick={item.action}
          >
            <item.icon />
          </Button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
