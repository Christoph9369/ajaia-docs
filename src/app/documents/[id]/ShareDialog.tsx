"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, Avatar, Button } from "@/components/ui";
import { api, ApiError } from "@/lib/client-api";
import type { Collaborator } from "@/lib/documents";

type Role = "viewer" | "editor";
type DirectoryUser = { id: string; name: string; email: string; color: string };

export function ShareDialog(props: {
  documentId: string;
  owner: { id: string; name: string; email: string; color: string };
  isOwner: boolean;
  currentUserId: string;
  onClose: () => void;
}) {
  const { documentId, owner, isOwner, currentUserId, onClose } = props;
  const router = useRouter();
  const [collaborators, setCollaborators] = useState<Collaborator[] | null>(null);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ collaborators: Collaborator[] }>(`/api/documents/${documentId}/collaborators`)
      .then((r) => setCollaborators(r.collaborators))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load people."));
    if (isOwner) {
      api<{ users: DirectoryUser[] }>("/api/users")
        .then((r) => setDirectory(r.users))
        .catch(() => {});
    }
  }, [documentId, isOwner]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sharedIds = new Set(collaborators?.map((c) => c.userId));
  const suggestions = directory.filter((u) => u.id !== owner.id && !sharedIds.has(u.id));

  async function share(targetEmail: string, targetRole: Role) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await api<{ collaborators: Collaborator[] }>(`/api/documents/${documentId}/collaborators`, {
        method: "POST",
        json: { email: targetEmail, role: targetRole },
      });
      setCollaborators(r.collaborators);
      setEmail("");
      setNotice(`${targetEmail} ${targetRole === "editor" ? "can now edit" : "can now view"} this document.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sharing failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Collaborator) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/documents/${documentId}/collaborators/${c.userId}`, { method: "DELETE" });
      if (c.userId === currentUserId) {
        router.push("/documents");
        return;
      }
      setCollaborators((list) => list?.filter((x) => x.userId !== c.userId) ?? null);
      setNotice(`Removed ${c.name}.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't remove access.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-24" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="share-title" className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="share-title" className="text-base font-semibold">
            {isOwner ? "Share document" : "People with access"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-md px-2 text-xl leading-none text-muted hover:bg-black/5" aria-label="Close">
            ×
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {isOwner && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) void share(email.trim(), role);
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Add people by email"
                list="share-suggestions"
                aria-label="Email address"
                className="min-w-0 flex-1 rounded-md border border-line px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
              />
              <datalist id="share-suggestions">
                {suggestions.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.name}
                  </option>
                ))}
              </datalist>
              <RoleSelect value={role} onChange={setRole} />
              <Button type="submit" variant="primary" disabled={busy || !email.trim()}>
                Share
              </Button>
            </form>
          )}

          {isOwner && suggestions.length > 0 && (
            <div className="text-xs text-muted">
              Demo accounts:{" "}
              {suggestions.map((u, i) => (
                <span key={u.id}>
                  <button type="button" className="text-accent hover:underline" onClick={() => setEmail(u.email)}>
                    {u.email}
                  </button>
                  {i < suggestions.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}

          {error && <Alert onDismiss={() => setError(null)}>{error}</Alert>}
          {notice && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}

          <ul className="divide-y divide-line" aria-label="People with access">
            <li className="flex items-center gap-3 py-2.5">
              <Avatar name={owner.name} color={owner.color} />
              <PersonLabel name={owner.name} email={owner.email} you={owner.id === currentUserId} />
              <span className="text-sm text-muted">Owner</span>
            </li>
            {collaborators === null && !error && <li className="py-3 text-sm text-muted">Loading…</li>}
            {collaborators?.map((c) => (
              <li key={c.userId} className="flex items-center gap-3 py-2.5">
                <Avatar name={c.name} color={c.color} />
                <PersonLabel name={c.name} email={c.email} you={c.userId === currentUserId} />
                {isOwner ? (
                  <>
                    <RoleSelect value={c.role} onChange={(r) => share(c.email, r)} disabled={busy} label={`Role for ${c.name}`} />
                    <Button variant="ghost" onClick={() => remove(c)} disabled={busy} aria-label={`Remove ${c.name}`}>
                      Remove
                    </Button>
                  </>
                ) : c.userId === currentUserId ? (
                  <Button variant="ghost" onClick={() => remove(c)} disabled={busy}>
                    Leave
                  </Button>
                ) : (
                  <span className="text-sm text-muted">{c.role === "editor" ? "Editor" : "Viewer"}</span>
                )}
              </li>
            ))}
          </ul>
          {collaborators?.length === 0 && isOwner && (
            <p className="text-sm text-muted">Only you can see this document. Add someone above to share it.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PersonLabel({ name, email, you }: { name: string; email: string; you: boolean }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium">
        {name} {you && <span className="font-normal text-muted">(you)</span>}
      </span>
      <span className="block truncate text-xs text-muted">{email}</span>
    </span>
  );
}

function RoleSelect({ value, onChange, disabled, label = "Access level" }: { value: Role; onChange: (r: Role) => void; disabled?: boolean; label?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Role)}
      disabled={disabled}
      aria-label={label}
      className="rounded-md border border-line bg-white px-2 py-1.5 text-sm"
    >
      <option value="editor">Can edit</option>
      <option value="viewer">Can view</option>
    </select>
  );
}
