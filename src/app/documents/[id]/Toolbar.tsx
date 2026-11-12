"use client";

import { type Editor, useEditorState } from "@tiptap/react";
import { cx } from "@/components/ui";

type BlockType = "paragraph" | "h1" | "h2" | "h3";

export function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      block: (e.isActive("heading", { level: 1 })
        ? "h1"
        : e.isActive("heading", { level: 2 })
          ? "h2"
          : e.isActive("heading", { level: 3 })
            ? "h3"
            : "paragraph") as BlockType,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  function setBlock(v: BlockType) {
    if (v === "paragraph") chain().setParagraph().run();
    else chain().setHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run();
  }

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
      <Btn label="Undo (Ctrl+Z)" onClick={() => chain().undo().run()} disabled={!s.canUndo}>
        <Icon d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
      </Btn>
      <Btn label="Redo (Ctrl+Shift+Z)" onClick={() => chain().redo().run()} disabled={!s.canRedo}>
        <Icon d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
      </Btn>
      <Sep />
      <select
        aria-label="Text style"
        value={s.block}
        onChange={(e) => setBlock(e.target.value as BlockType)}
        className="h-8 rounded-md border border-transparent bg-transparent px-2 text-sm hover:bg-black/5 focus:border-line"
      >
        <option value="paragraph">Normal text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <Sep />
      <Btn label="Bold (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <span className="font-bold">B</span>
      </Btn>
      <Btn label="Italic (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <span className="font-serif italic">I</span>
      </Btn>
      <Btn label="Underline (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
        <span className="underline">U</span>
      </Btn>
      <Btn label="Strikethrough" active={s.strike} onClick={() => chain().toggleStrike().run()}>
        <span className="line-through">S</span>
      </Btn>
      <Sep />
      <Btn label="Bulleted list" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
        <Icon d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
      </Btn>
      <Btn label="Numbered list" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <Icon d="M10 6h10M10 12h10M10 18h10M4 4.5h1.5V9M4 9h3M4 14.5a1.5 1.5 0 0 1 3 .5c0 1-3 2-3 3.5h3" />
      </Btn>
      <Btn label="Quote" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
        <Icon d="M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6" />
      </Btn>
      <Sep />
      <Btn label="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}>
        <Icon d="M4 7V5h12v2M10 5l-3 14M4 21l16-16" />
      </Btn>
    </div>
  );
}

function Btn(props: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={props.label}
      aria-label={props.label}
      aria-pressed={props.active}
      disabled={props.disabled}
      // Keep the text selection when clicking toolbar buttons.
      onMouseDown={(e) => e.preventDefault()}
      onClick={props.onClick}
      className={cx(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm transition-colors",
        props.active ? "bg-accent-soft text-accent" : "text-ink hover:bg-black/5",
        props.disabled && "cursor-not-allowed opacity-35 hover:bg-transparent",
      )}
    >
      {props.children}
    </button>
  );
}

function Sep() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-line" />;
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
