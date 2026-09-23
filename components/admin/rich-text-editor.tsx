"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { Bold, Heading1, Heading2, Italic, Link as LinkIcon, List, ListOrdered, Quote, Strikethrough, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";

const toolbarButton =
  "flex h-8 w-8 items-center justify-center rounded-md text-[#41515b] transition-colors hover:bg-[#eef1f0] disabled:opacity-40";
const toolbarButtonActive = "bg-[#0b1b29] text-white hover:bg-[#0b1b29]";
const toolbarLabel = "h-8 rounded-md px-2 text-[12px] font-bold text-[#41515b] hover:bg-[#eef1f0]";

export function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose-editor min-h-[220px] px-4 py-3 text-[13.5px] leading-6 text-[#152431] outline-none",
        placeholder: placeholder ?? "",
      },
    },
    immediatelyRender: false,
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      strike: e?.isActive("strike") ?? false,
      h2: e?.isActive("heading", { level: 2 }) ?? false,
      h3: e?.isActive("heading", { level: 3 }) ?? false,
      bullet: e?.isActive("bulletList") ?? false,
      ordered: e?.isActive("orderedList") ?? false,
      quote: e?.isActive("blockquote") ?? false,
      link: e?.isActive("link") ?? false,
    }),
  });

  const s = state ?? { bold: false, italic: false, strike: false, h2: false, h3: false, bullet: false, ordered: false, quote: false, link: false };

  if (!editor) {
    return <div className="rounded-lg border border-[#d7dee0] bg-[#fafbfa] p-4 text-[13px] text-[#8a969c]">Loading editor…</div>;
  }

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#d7dee0] focus-within:border-[#0b1b29]">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[#eef1f0] bg-[#fafbfa] px-2 py-1.5">
        <button type="button" className={cn(toolbarButton, s.bold && toolbarButtonActive)} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold size={15} />
        </button>
        <button type="button" className={cn(toolbarButton, s.italic && toolbarButtonActive)} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic size={15} />
        </button>
        <button type="button" className={cn(toolbarButton, s.strike && toolbarButtonActive)} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <Strikethrough size={15} />
        </button>
        <span className="mx-1 h-5 w-px bg-[#e4e9ea]" />
        <button type="button" className={cn(toolbarButton, s.h2 && toolbarButtonActive)} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading">
          <Heading2 size={15} />
        </button>
        <button type="button" className={cn(toolbarButton, s.h3 && toolbarButtonActive)} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Sub-heading">
          <Heading1 size={15} />
        </button>
        <span className="mx-1 h-5 w-px bg-[#e4e9ea]" />
        <button type="button" className={cn(toolbarButton, s.bullet && toolbarButtonActive)} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
          <List size={15} />
        </button>
        <button type="button" className={cn(toolbarButton, s.ordered && toolbarButtonActive)} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
          <ListOrdered size={15} />
        </button>
        <button type="button" className={cn(toolbarButton, s.quote && toolbarButtonActive)} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
          <Quote size={15} />
        </button>
        <span className="mx-1 h-5 w-px bg-[#e4e9ea]" />
        <button type="button" className={cn(toolbarButton, s.link && toolbarButtonActive)} onClick={setLink} title="Add link">
          <LinkIcon size={15} />
        </button>
        <button type="button" className={toolbarButton} onClick={() => editor.chain().focus().unsetLink().run()} title="Remove link">
          <Unlink size={15} />
        </button>
        <span className="mx-1 h-5 w-px bg-[#e4e9ea]" />
        <button type="button" className={toolbarLabel} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          + Table
        </button>
        <button type="button" className={toolbarLabel} onClick={() => editor.chain().focus().addRowAfter().run()}>
          + Row
        </button>
        <button type="button" className={toolbarLabel} onClick={() => editor.chain().focus().addColumnAfter().run()}>
          + Col
        </button>
        <button type="button" className={toolbarLabel} onClick={() => editor.chain().focus().deleteRow().run()}>
          −Row
        </button>
        <button type="button" className={toolbarLabel} onClick={() => editor.chain().focus().deleteColumn().run()}>
          −Col
        </button>
        <button type="button" className={toolbarLabel} onClick={() => editor.chain().focus().deleteTable().run()}>
          Del table
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="rte-content [&_.ProseMirror]:outline-none [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:my-2 [&_.ProseMirror_p]:my-1.5 [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-extrabold [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-1.5 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_blockquote]:my-2 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-[#e7a42b] [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_a]:text-[#b3541e] [&_.ProseMirror_a]:underline [&_.ProseMirror_table]:my-3 [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-[#d5dde0] [&_.ProseMirror_th]:bg-[#f2f4f3] [&_.ProseMirror_th]:px-2.5 [&_.ProseMirror_th]:py-1.5 [&_.ProseMirror_th]:font-bold [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-[#d5dde0] [&_.ProseMirror_td]:px-2.5 [&_.ProseMirror_td]:py-1.5 [&_.ProseMirror_selectedCell]:bg-[#fdf3e0]"
      />
    </div>
  );
}