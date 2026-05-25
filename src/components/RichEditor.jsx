import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Typography from "@tiptap/extension-typography";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import {
  TextB, TextItalic, TextUnderline, ListBullets, ListNumbers,
  TextHOne, TextHTwo, TextHThree, Quotes, LinkSimple,
  ArrowCounterClockwise, ArrowClockwise, Table as TableIcon,
} from "@phosphor-icons/react";

const ToolbarButton = ({ active, onClick, title, children, testId }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    data-testid={testId}
    className={`p-2 rounded-md transition-all ${
      active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
    }`}
  >
    {children}
  </button>
);

const RichEditor = ({ value, onChange, placeholder = "Comece a escrever o documento..." }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "underline text-blue-600" } }),
      Typography,
      Image.configure({ inline: true, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "tiptap-editor",
        "data-placeholder": placeholder,
        "data-testid": "rich-editor-content",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange?.(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = value || "";
    const current = editor.getHTML();
    if (next !== current) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden" data-testid="rich-editor">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 bg-slate-50">
        <ToolbarButton testId="ed-h1" title="Título 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><TextHOne size={18} /></ToolbarButton>
        <ToolbarButton testId="ed-h2" title="Título 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><TextHTwo size={18} /></ToolbarButton>
        <ToolbarButton testId="ed-h3" title="Título 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><TextHThree size={18} /></ToolbarButton>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ToolbarButton testId="ed-bold" title="Negrito" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><TextB size={18} /></ToolbarButton>
        <ToolbarButton testId="ed-italic" title="Itálico" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><TextItalic size={18} /></ToolbarButton>
        <ToolbarButton testId="ed-underline" title="Sublinhado" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><TextUnderline size={18} /></ToolbarButton>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ToolbarButton testId="ed-ul" title="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><ListBullets size={18} /></ToolbarButton>
        <ToolbarButton testId="ed-ol" title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListNumbers size={18} /></ToolbarButton>
        <ToolbarButton testId="ed-quote" title="Citação" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quotes size={18} /></ToolbarButton>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ToolbarButton
          testId="ed-table"
          title="Inserir tabela 3×3"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <TableIcon size={18} />
        </ToolbarButton>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ToolbarButton testId="ed-link" title="Link" active={editor.isActive("link")} onClick={() => {
          const prev = editor.getAttributes("link").href;
          const url = window.prompt("URL do link", prev || "https://");
          if (url === null) return;
          if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}><LinkSimple size={18} /></ToolbarButton>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ToolbarButton testId="ed-undo" title="Desfazer" onClick={() => editor.chain().focus().undo().run()}><ArrowCounterClockwise size={18} /></ToolbarButton>
        <ToolbarButton testId="ed-redo" title="Refazer" onClick={() => editor.chain().focus().redo().run()}><ArrowClockwise size={18} /></ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichEditor;
