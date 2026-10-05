"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic, LinkIcon,
  List, ListOrdered, Quote, Redo2, Strikethrough, UnderlineIcon, Undo2, Unlink, RemoveFormatting,
  Check, ChevronDown, Highlighter, Paintbrush, Type,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FONTS = [
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", value: "Times New Roman, Times, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Courier New", value: "Courier New, Courier, monospace" },
];
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map((size) => ({ label: `${size}px`, value: `${size}px` }));
const COLORS = [
  { label: "Đen", value: "#0f172a" }, { label: "Xám", value: "#475569" },
  { label: "Đỏ", value: "#b91c1c" }, { label: "Cam", value: "#c2410c" },
  { label: "Xanh lá", value: "#15803d" }, { label: "Xanh dương", value: "#1d4ed8" },
  { label: "Tím", value: "#7e22ce" },
];
const HIGHLIGHTS = [
  { label: "Vàng", value: "#fef08a" }, { label: "Xanh lá", value: "#bbf7d0" },
  { label: "Xanh dương", value: "#bfdbfe" }, { label: "Hồng", value: "#fbcfe8" },
];
const BLOCKS = [
  { label: "Paragraph", value: "paragraph" },
  ...[1, 2, 3, 4, 5, 6].map((level) => ({ label: `Heading ${level}`, value: String(level) })),
];
const HEADING_PREVIEWS: Record<string, string> = {
  "1": "text-2xl font-bold", "2": "text-xl font-bold", "3": "text-lg font-semibold",
  "4": "text-base font-semibold", "5": "text-sm font-semibold", "6": "text-xs font-semibold",
};
const CONTENT_CLASS = "min-h-40 px-3 py-3 text-sm leading-relaxed outline-none [overflow-wrap:anywhere] [&_p]:my-2 [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-muted-foreground [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-xl [&_h4]:text-lg [&_h5]:text-base [&_h6]:text-sm [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold [&_h4]:font-semibold [&_h5]:font-semibold [&_h6]:font-semibold [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-blue-700 [&_a]:underline [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-3 [&_hr]:my-4";

export function RichTextEditor({
  value, onChange, onBlur, placeholder, invalid, label = "Nội dung", disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  label?: string;
  disabled?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Tiptap 3 StarterKit already includes Link and Underline.
      StarterKit.configure({ link: { openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } } }),
      TextStyle, FontFamily, FontSize, Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder || "Nhập nội dung..." }),
    ],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: CONTENT_CLASS, role: "textbox", "aria-multiline": "true",
        "aria-label": label, "aria-invalid": String(Boolean(invalid)),
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
    onBlur: () => onBlur?.(),
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled, false);
    editor.setOptions({ editorProps: { attributes: {
      class: CONTENT_CLASS, role: "textbox", "aria-multiline": "true", "aria-label": label,
      "aria-invalid": String(Boolean(invalid)), "aria-disabled": String(disabled),
    } } });
  }, [editor, disabled, invalid, label]);

  if (!editor) return <div aria-label="Đang tải trình soạn thảo" className="h-52 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className={cn(
      "overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm focus-within:border-cyan-600 focus-within:ring-3 focus-within:ring-cyan-400/20",
      invalid && "border-destructive ring-3 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20",
      disabled && "opacity-60",
    )}>
      <EditorToolbar editor={editor} disabled={disabled} />
      <EditorContent editor={editor} />
    </div>
  );
}

function EditorToolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  // Selection-only transactions must refresh the toolbar too, not just content updates.
  useEditorState({ editor, selector: ({ transactionNumber }) => transactionNumber });
  const [linkError, setLinkError] = useState("");
  const textStyle = editor.getAttributes("textStyle");
  const heading = editor.getAttributes("heading").level;
  const setLink = () => {
    const href = window.prompt("Nhập đường dẫn (để trống để xóa liên kết)", editor.getAttributes("link").href || "https://");
    if (href === null) return;
    setLinkError("");
    try {
      const chain = editor.chain().focus().extendMarkRange("link");
      const success = href.trim() ? chain.setLink({ href: href.trim() }).run() : chain.unsetLink().run();
      if (!success) setLinkError("Đường dẫn không hợp lệ. Vui lòng kiểm tra lại.");
    } catch {
      setLinkError("Đường dẫn không hợp lệ. Vui lòng kiểm tra lại.");
    }
  };
  const buttons = [
    { label: "Hoàn tác", icon: Undo2, disabled: !editor.can().undo(), action: () => editor.chain().focus().undo().run() },
    { label: "Làm lại", icon: Redo2, disabled: !editor.can().redo(), action: () => editor.chain().focus().redo().run() },
    { label: "In đậm", icon: Bold, active: editor.isActive("bold"), action: () => editor.chain().focus().toggleBold().run() },
    { label: "In nghiêng", icon: Italic, active: editor.isActive("italic"), action: () => editor.chain().focus().toggleItalic().run() },
    { label: "Gạch chân", icon: UnderlineIcon, active: editor.isActive("underline"), action: () => editor.chain().focus().toggleUnderline().run() },
    { label: "Gạch ngang", icon: Strikethrough, active: editor.isActive("strike"), action: () => editor.chain().focus().toggleStrike().run() },
    { label: "Căn trái", icon: AlignLeft, active: editor.isActive({ textAlign: "left" }), action: () => editor.chain().focus().setTextAlign("left").run() },
    { label: "Căn giữa", icon: AlignCenter, active: editor.isActive({ textAlign: "center" }), action: () => editor.chain().focus().setTextAlign("center").run() },
    { label: "Căn phải", icon: AlignRight, active: editor.isActive({ textAlign: "right" }), action: () => editor.chain().focus().setTextAlign("right").run() },
    { label: "Căn đều", icon: AlignJustify, active: editor.isActive({ textAlign: "justify" }), action: () => editor.chain().focus().setTextAlign("justify").run() },
    { label: "Danh sách", icon: List, active: editor.isActive("bulletList"), action: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Danh sách số", icon: ListOrdered, active: editor.isActive("orderedList"), action: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Trích dẫn", icon: Quote, active: editor.isActive("blockquote"), action: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Liên kết", icon: LinkIcon, active: editor.isActive("link"), action: setLink },
    { label: "Xóa liên kết", icon: Unlink, disabled: !editor.isActive("link"), action: () => editor.chain().focus().extendMarkRange("link").unsetLink().run() },
    { label: "Xóa định dạng", icon: RemoveFormatting, action: () => editor.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().run() },
  ];

  return (
    <fieldset disabled={disabled} className="min-w-0 border-b border-slate-200 bg-slate-50/80 p-1">
      <legend className="sr-only">Định dạng nội dung</legend>
      <div role="group" aria-label="Công cụ định dạng" className="flex flex-wrap items-center gap-0.5">
        <ToolbarMenu editor={editor} disabled={disabled} label="Kiểu đoạn" value={heading ? String(heading) : "paragraph"} options={BLOCKS}
          triggerClassName="w-28 justify-between" renderOption={(option) => <span className={HEADING_PREVIEWS[option.value]}>{option.label}</span>} onChange={(value) => {
          const level = Number(value);
          if (level === 1 || level === 2 || level === 3 || level === 4 || level === 5 || level === 6) editor.chain().focus().setHeading({ level }).run();
          else editor.chain().focus().setParagraph().run();
        }} />
        <ToolbarMenu editor={editor} disabled={disabled} label="Font chữ" value={textStyle.fontFamily || ""} options={FONTS} emptyLabel="Font chữ"
          triggerClassName="w-28 justify-between" renderOption={(option) => <span style={{ fontFamily: option.value || undefined }}>{option.label}</span>} onChange={(value) => {
          if (value) editor.chain().focus().setFontFamily(value).run();
          else editor.chain().focus().unsetFontFamily().run();
        }} />
        <ToolbarMenu editor={editor} disabled={disabled} label="Cỡ chữ" value={textStyle.fontSize || ""} options={FONT_SIZES} emptyLabel="Cỡ chữ" onChange={(value) => {
          if (value) editor.chain().focus().setFontSize(value).run();
          else editor.chain().focus().unsetFontSize().run();
        }} />
        <ToolbarSeparator />
        <ToolbarMenu editor={editor} disabled={disabled} label="Màu chữ" value={textStyle.color || ""} options={COLORS} emptyLabel="Mặc định" palette
          trigger={<span className="flex flex-col items-center"><Type className="size-4" /><span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: textStyle.color || "#0f172a" }} /></span>} onChange={(value) => {
          if (value) editor.chain().focus().setColor(value).run();
          else editor.chain().focus().unsetColor().run();
        }} />
        <ToolbarMenu editor={editor} disabled={disabled} label="Tô sáng" value={editor.getAttributes("highlight").color || ""} options={HIGHLIGHTS} emptyLabel="Không tô sáng" palette
          trigger={<span className="flex flex-col items-center"><Highlighter className="size-4" /><span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: editor.getAttributes("highlight").color || "#fef08a" }} /></span>} onChange={(value) => {
          if (value) editor.chain().focus().setHighlight({ color: value }).run();
          else editor.chain().focus().unsetHighlight().run();
        }} />
        {buttons.map((item, index) => (
          <Fragment key={item.label}>
            {[0, 2, 6, 10, 13].includes(index) && <ToolbarSeparator />}
            <Button type="button" variant="ghost" size="icon-sm" title={item.label} aria-label={item.label}
              aria-pressed={item.active} disabled={disabled || item.disabled} className={cn("rounded-sm", item.active && "bg-blue-100 text-blue-700")}
              onMouseDown={(event) => event.preventDefault()} onClick={item.action}>
              <item.icon />
            </Button>
          </Fragment>
        ))}
      </div>
      {linkError && <p role="alert" className="text-xs text-destructive">{linkError}</p>}
    </fieldset>
  );
}

function ToolbarSeparator() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-slate-300" />;
}

type ToolbarOption = { label: string; value: string };

function ToolbarMenu({ editor, disabled, label, value, options, emptyLabel, onChange, trigger, triggerClassName, renderOption, palette = false }: {
  editor: Editor;
  disabled: boolean;
  label: string;
  value: string;
  options: ToolbarOption[];
  emptyLabel?: string;
  onChange: (value: string) => void;
  trigger?: ReactNode;
  triggerClassName?: string;
  renderOption?: (option: ToolbarOption) => ReactNode;
  palette?: boolean;
}) {
  const applied = useRef(false);
  const selected = options.find((option) => option.value === value);
  const items = [
    ...(emptyLabel ? [{ label: palette ? emptyLabel : "Mặc định", value: "" }] : []),
    ...(value && !selected ? [{ label: value, value }] : []),
    ...options,
  ];
  const displayLabel = selected?.label || value || emptyLabel || label;

  return (
    <Menu.Root disabled={disabled} modal={false} orientation={palette ? "horizontal" : "vertical"}
      onOpenChange={(open) => { if (open) applied.current = false; }}>
      <Menu.Trigger type="button" disabled={disabled} title={`${label}: ${displayLabel}`} aria-label={`${label}: ${displayLabel}`}
        className={cn("inline-flex h-8 shrink-0 items-center gap-1 rounded-sm px-2 text-xs text-slate-700 outline-none hover:bg-slate-200/70 focus-visible:ring-2 focus-visible:ring-blue-500 data-popup-open:bg-blue-100 data-popup-open:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50", triggerClassName)}>
        {trigger || <span className="truncate">{displayLabel}</span>}
        <ChevronDown aria-hidden="true" className="size-3 shrink-0" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={4} className="z-[100] outline-none">
          <Menu.Popup aria-label={label}
            finalFocus={() => applied.current && !editor.isDestroyed ? editor.view.dom : true}
            className="max-h-[min(20rem,var(--available-height))] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-lg outline-none">
            {palette && <p className="px-2 pb-2 pt-1 text-xs font-medium text-slate-500">{label}</p>}
            <Menu.RadioGroup value={value} className={palette ? "flex gap-1" : "min-w-48"}>
              {items.map((option) => (
                <Menu.RadioItem key={option.value} value={option.value} label={option.label} closeOnClick disabled={disabled}
                  title={option.label} aria-label={option.label}
                  onClick={() => {
                    if (disabled || editor.isDestroyed) return;
                    // Menu focus does not alter ProseMirror's selection; focus() restores it.
                    applied.current = true;
                    onChange(option.value);
                  }}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm outline-none data-highlighted:bg-blue-50 data-highlighted:ring-1 data-highlighted:ring-inset data-highlighted:ring-blue-500 data-checked:bg-blue-50",
                    palette ? "size-8 justify-center" : "min-h-9 gap-2 py-1.5 pl-7 pr-5 text-sm",
                  )}>
                  {palette ? (
                    <span className="grid size-6 place-items-center rounded-sm border border-black/15" style={{ backgroundColor: option.value || "transparent" }}>
                      {!option.value && <Paintbrush className="size-3.5 text-slate-500" />}
                      <Menu.RadioItemIndicator className="absolute -right-0.5 -top-0.5 rounded-full bg-blue-600 p-0.5 text-white"><Check className="size-2.5" /></Menu.RadioItemIndicator>
                    </span>
                  ) : (
                    <>
                      <Menu.RadioItemIndicator className="absolute left-1.5 text-blue-700"><Check className="size-3.5" /></Menu.RadioItemIndicator>
                      {renderOption ? renderOption(option) : option.label}
                    </>
                  )}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
