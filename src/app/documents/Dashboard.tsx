"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, Button, RoleBadge, formatRelative } from "@/components/ui";
import { api, ApiError } from "@/lib/client-api";
import type { DocumentSummary } from "@/lib/documents";

const ACCEPT = ".txt,.md,.docx";
const MAX_MB = 5;

export function Dashboard({ owned, shared }: { owned: DocumentSummary[]; shared: DocumentSummary[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "create" | "import">(null);
  const [error, setError] = useState<string | null>(null);

  async function createBlank() {
    setBusy("create");
    setError(null);
    try {
      const doc = await api<{ id: string }>("/api/documents", { method: "POST", json: {} });
      router.push(`/documents/${doc.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't create a document.");
      setBusy(null);
    }
  }

  async function importFile(file: File) {
    setError(null);
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPT.split(",").includes(ext)) {
      setError(`“${file.name}” isn't supported. Upload a .txt, .md or .docx file.`);
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`“${file.name}” is larger than ${MAX_MB} MB.`);
      return;
    }
    setBusy("import");
    try {
      const body = new FormData();
      body.append("file", file);
      const doc = await api<{ id: string }>("/api/documents/import", { method: "POST", body });
      router.push(`/documents/${doc.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Import failed.");
      setBusy(null);
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 rounded-xl border border-line bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Start a document</h1>
          <p className="text-sm text-muted">
            Create a blank document, or import a file. Supported: <strong>.txt</strong>, <strong>.md</strong>,{" "}
            <strong>.docx</strong> (up to {MAX_MB} MB).
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            id="import-file"
            aria-label="Import file"
            data-testid="import-input"
            onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
          />
          <Button onClick={() => fileInput.current?.click()} disabled={busy !== null}>
            {busy === "import" ? "Importing…" : "Import file"}
          </Button>
          <Button variant="primary" onClick={createBlank} disabled={busy !== null}>
            {busy === "create" ? "Creating…" : "+ New document"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6">
          <Alert onDismiss={() => setError(null)}>{error}</Alert>
        </div>
      )}

      <Section
        title="My documents"
        subtitle="Documents you own"
        docs={owned}
        empty="You don't own any documents yet. Create one or import a file to get started."
        onChange={() => router.refresh()}
      />
      <Section
        title="Shared with me"
        subtitle="Documents other people have shared with you"
        docs={shared}
        empty="Nothing has been shared with you yet."
        onChange={() => router.refresh()}
      />
    </main>
  );
}

function Section(props: {
  title: string;
  subtitle: string;
  docs: DocumentSummary[];
  empty: string;
  onChange: () => void;
}) {
  const headingId = `${props.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;
  return (
    <section className="mb-10" aria-labelledby={headingId}>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 id={headingId} className="text-base font-semibold">
            {props.title} <span className="ml-1.5 rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium tabular-nums text-muted">{props.docs.length}</span>
          </h2>
          <p className="text-xs text-muted">{props.subtitle}</p>
        </div>
      </div>
      {props.docs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-white/60 px-4 py-6 text-center text-sm text-muted">
          {props.empty}
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          {props.docs.map((d) => (
            <DocRow key={d.id} doc={d} onChange={props.onChange} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DocRow({ doc, onChange }: { doc: DocumentSummary; onChange: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setDeleting(true);
    try {
      await api(`/api/documents/${doc.id}`, { method: "DELETE" });
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <li className="group flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
      <DocIcon />
      <Link href={`/documents/${doc.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{doc.title}</span>
          <RoleBadge role={doc.access} />
        </div>
        <div className="mt-0.5 truncate text-sm text-muted">
          {doc.snippet || <em>Empty document</em>}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
          {doc.access === "owner" ? (
            <span>{doc.collaboratorCount > 0 ? `Shared with ${doc.collaboratorCount}` : "Private"}</span>
          ) : (
            <span>Shared by {doc.owner.name}</span>
          )}
          <span>Edited {formatRelative(doc.updatedAt)}</span>
          {doc.importedFrom && <span>Imported from {doc.importedFrom}</span>}
        </div>
        {error && <div className="mt-1 text-xs text-red-700">{error}</div>}
      </Link>
      {doc.access === "owner" &&
        (confirming ? (
          <div className="flex gap-1">
            <Button variant="danger" onClick={remove} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={deleting}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 focus:opacity-100"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${doc.title}`}
          >
            Delete
          </Button>
        ))}
    </li>
  );
}

function DocIcon() {
  return (
    <svg width="28" height="34" viewBox="0 0 28 34" aria-hidden className="shrink-0">
      <path d="M2 2h16l8 8v22H2z" fill="#fff" stroke="#c9d1dc" strokeWidth="1.5" />
      <path d="M18 2v8h8" fill="none" stroke="#c9d1dc" strokeWidth="1.5" />
      <path d="M7 16h14M7 20h14M7 24h9" stroke="#2f5bea" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
