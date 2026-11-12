"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Alert, Button, RoleBadge, formatRelative } from "@/components/ui";
import type { DocumentDetail } from "@/lib/documents";
import { ShareDialog } from "./ShareDialog";
import { Toolbar } from "./Toolbar";
import { useAutosave, type SaveStatus } from "./useAutosave";

type CurrentUser = { id: string; name: string; email: string; color: string };

export function DocumentEditor({ initial, currentUser }: { initial: DocumentDetail; currentUser: CurrentUser }) {
  const canEdit = initial.access !== "viewer";
  const isOwner = initial.access === "owner";
  const [title, setTitle] = useState(initial.title);
  const [shareOpen, setShareOpen] = useState(false);
  const save = useAutosave(initial.id, initial.version, initial.updatedAt);
  const queueRef = useRef(save.queue);
  queueRef.current = save.queue;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      Placeholder.configure({ placeholder: canEdit ? "Start writing…" : "This document is empty." }),
    ],
    content: initial.content,
    editable: canEdit,
    immediatelyRender: false, // avoid SSR hydration mismatch
    editorProps: { attributes: { "aria-label": "Document body", spellcheck: "true" } },
    onUpdate: ({ editor: e }) => queueRef.current({ content: e.getHTML() }),
  });

  // Ctrl/Cmd+S saves immediately instead of opening the browser's save dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save.flush();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  function onTitleChange(value: string) {
    setTitle(value);
    if (value.trim()) save.queue({ title: value.trim().slice(0, 200) });
  }

  function onTitleBlur() {
    if (!title.trim()) {
      setTitle("Untitled document");
      save.queue({ title: "Untitled document" });
    }
  }

  function loadLatest() {
    const latest = save.acceptRemote();
    if (latest && editor) {
      editor.commands.setContent(latest.content, { emitUpdate: false });
      setTitle(latest.title);
    }
  }

  function keepMine() {
    if (!editor) return;
    save.overwriteRemote({ title: title.trim() || "Untitled document", content: editor.getHTML() });
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30">
        <AppHeader user={currentUser} sticky={false} />
        <div className="border-b border-line bg-white">
          <div className="mx-auto max-w-5xl px-4 py-2">
            <div className="flex items-center gap-2">
              <Link href="/documents" className="rounded-md p-1.5 text-muted hover:bg-black/5 hover:text-ink" aria-label="Back to documents" title="Back to documents">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>
              <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                onBlur={onTitleBlur}
                onKeyDown={(e) => e.key === "Enter" && editor?.commands.focus("start")}
                readOnly={!canEdit}
                maxLength={200}
                aria-label="Document title"
                className="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-lg font-semibold hover:border-line focus:border-accent focus:outline-none read-only:hover:border-transparent"
              />
              <Button variant={isOwner ? "primary" : "secondary"} onClick={() => setShareOpen(true)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6" />
                </svg>
                {isOwner ? "Share" : "People"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-11 text-xs text-muted">
              <RoleBadge role={initial.access} />
              {!isOwner && <span>Owned by {initial.owner.name}</span>}
              <SaveIndicator status={save.status} lastSavedAt={save.lastSavedAt} canEdit={canEdit} />
            </div>
          </div>
          {canEdit && editor && (
            <div className="border-t border-line bg-[#f8f9fb]">
              <div className="mx-auto max-w-5xl">
                <Toolbar editor={editor} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[850px] px-4 py-8">
        {!canEdit && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            You have view-only access. Ask {initial.owner.name} for edit access to make changes.
          </div>
        )}
        {save.status === "conflict" && (
          <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-900">
            <span className="flex-1">Someone else saved this document while you were editing. Your latest changes are not saved yet.</span>
            <Button onClick={loadLatest}>Load their version</Button>
            <Button variant="primary" onClick={keepMine}>
              Keep mine
            </Button>
          </div>
        )}
        {save.status === "error" && save.error && (
          <div className="mb-4">
            <Alert>
              {save.error}{" "}
              <button type="button" className="font-medium underline" onClick={save.retry}>
                Retry
              </button>
            </Alert>
          </div>
        )}
        {initial.importedFrom && (
          <p className="mb-3 text-xs text-muted">Imported from {initial.importedFrom}</p>
        )}
        <article className="doc-content min-h-[70vh] rounded-sm border border-line bg-white px-6 py-10 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:px-16 sm:py-14">
          {editor ? <EditorContent editor={editor} /> : <div className="h-[60vh] animate-pulse rounded bg-gray-50" />}
        </article>
      </div>

      {shareOpen && (
        <ShareDialog
          documentId={initial.id}
          owner={initial.owner}
          isOwner={isOwner}
          currentUserId={currentUser.id}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

function SaveIndicator({ status, lastSavedAt, canEdit }: { status: SaveStatus; lastSavedAt: string; canEdit: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!canEdit) return <span>Last edited {formatRelative(lastSavedAt)}</span>;
  const text: Record<SaveStatus, string> = {
    saved: `Saved ${formatRelative(lastSavedAt)}`,
    unsaved: "Unsaved changes…",
    saving: "Saving…",
    error: "Not saved",
    conflict: "Not saved (conflict)",
  };
  return (
    <span aria-live="polite" data-testid="save-status" className={status === "error" || status === "conflict" ? "text-red-700" : undefined}>
      {text[status]}
    </span>
  );
}
