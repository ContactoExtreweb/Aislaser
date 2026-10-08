"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extension-placeholder";
import { AlignCenter, AlignJustify, AlignLeft, Bold, Italic, List, ListOrdered, Redo2, Underline, Undo2 } from "lucide-react";
import { imageFilesFrom } from "@/lib/dossier/image";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Si el usuario pega o arrastra fotos dentro del texto, se envían aquí */
  onImages?: (files: File[]) => void;
  minHeight?: number;
};

export function RichText({ value, onChange, placeholder, onImages, minHeight = 140 }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
        link: false,
      }),
      TextAlign.configure({ types: ["paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? "Escribe aquí…" }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "dossier-richtext prose-editor focus:outline-none",
        style: `min-height:${minHeight}px`,
      },
      handlePaste: (_view, event) => {
        const files = imageFilesFrom(event.clipboardData?.files);
        if (files.length && onImages) {
          onImages(files);
          return true;
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = imageFilesFrom((event as DragEvent).dataTransfer?.files);
        if (files.length && onImages) {
          event.preventDefault();
          onImages(files);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.isEmpty ? "" : editor.getHTML());
    },
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white transition-colors focus-within:border-ink-900 focus-within:ring-4 focus-within:ring-laser-500/25">
      {editor && <Toolbar editor={editor} />}
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      left: e.isActive({ textAlign: "left" }),
      center: e.isActive({ textAlign: "center" }),
      justify: e.isActive({ textAlign: "justify" }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const btn = (active: boolean) =>
    `grid size-9 place-items-center rounded-lg transition-colors ${
      active ? "bg-ink-900 text-laser-500" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
    } disabled:opacity-30`;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-ink-100 bg-ink-50/70 px-2 py-1.5" role="toolbar" aria-label="Formato de texto">
      <button type="button" title="Negrita (Ctrl+B)" aria-label="Negrita" className={btn(state.bold)} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" strokeWidth={2.5} />
      </button>
      <button type="button" title="Cursiva (Ctrl+I)" aria-label="Cursiva" className={btn(state.italic)} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" />
      </button>
      <button type="button" title="Subrayado (Ctrl+U)" aria-label="Subrayado" className={btn(state.underline)} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Underline className="size-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-ink-200" />
      <button type="button" title="Lista con viñetas" aria-label="Lista con viñetas" className={btn(state.bullet)} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="size-4" />
      </button>
      <button type="button" title="Lista numerada" aria-label="Lista numerada" className={btn(state.ordered)} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="size-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-ink-200" />
      <button type="button" title="Alinear a la izquierda" aria-label="Alinear a la izquierda" className={btn(state.left)} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <AlignLeft className="size-4" />
      </button>
      <button type="button" title="Centrar" aria-label="Centrar" className={btn(state.center)} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <AlignCenter className="size-4" />
      </button>
      <button type="button" title="Justificar" aria-label="Justificar" className={btn(state.justify)} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
        <AlignJustify className="size-4" />
      </button>
      <span className="ml-auto flex items-center gap-0.5">
        <button type="button" title="Deshacer (Ctrl+Z)" aria-label="Deshacer" className={btn(false)} disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="size-4" />
        </button>
        <button type="button" title="Rehacer (Ctrl+Y)" aria-label="Rehacer" className={btn(false)} disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="size-4" />
        </button>
      </span>
    </div>
  );
}
