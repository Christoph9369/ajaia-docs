"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client-api";
import type { DocumentDetail } from "@/lib/documents";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict";

type Patch = { title?: string; content?: string };

const DEBOUNCE_MS = 800;

/**
 * Debounced, serialized autosave with optimistic concurrency.
 * - Changes are batched and sent at most one request at a time.
 * - Every PATCH carries the version we last saw; the server rejects stale writes with 409.
 * - Failed saves keep the unsent changes so nothing typed is lost.
 */
export function useAutosave(documentId: string, initialVersion: number, initialUpdatedAt: string) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<DocumentDetail | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState(initialUpdatedAt);

  const version = useRef(initialVersion);
  const pending = useRef<Patch>({});
  const inFlight = useRef(false);
  const blocked = useRef(false); // true while in conflict/error state; stops automatic retries
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasPending = () => Object.keys(pending.current).length > 0;

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (inFlight.current || blocked.current || !hasPending()) return;

    const patch = pending.current;
    pending.current = {};
    inFlight.current = true;
    setStatus("saving");

    try {
      const res = await api<{ version: number; updatedAt: string }>(`/api/documents/${documentId}`, {
        method: "PATCH",
        json: { ...patch, version: version.current },
      });
      version.current = res.version;
      setLastSavedAt(res.updatedAt);
      setError(null);
      setStatus(hasPending() ? "unsaved" : "saved");
    } catch (e) {
      // Put the unsent changes back underneath anything typed since.
      pending.current = { ...patch, ...pending.current };
      blocked.current = true;
      if (e instanceof ApiError && e.code === "CONFLICT") {
        setConflict((e.details as { current: DocumentDetail }).current);
        setStatus("conflict");
      } else {
        setError(e instanceof ApiError ? e.message : "Couldn't save your changes.");
        setStatus("error");
      }
    } finally {
      inFlight.current = false;
      if (!blocked.current && hasPending()) void flush();
    }
  }, [documentId]);

  const queue = useCallback(
    (patch: Patch) => {
      Object.assign(pending.current, patch);
      if (blocked.current) return; // keep collecting; user resolves the error/conflict first
      setStatus("unsaved");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [flush],
  );

  const retry = useCallback(() => {
    blocked.current = false;
    setError(null);
    void flush();
  }, [flush]);

  /** Conflict: discard local changes and adopt the server copy. */
  const acceptRemote = useCallback(() => {
    if (!conflict) return null;
    version.current = conflict.version;
    pending.current = {};
    blocked.current = false;
    setLastSavedAt(conflict.updatedAt);
    setConflict(null);
    setStatus("saved");
    return conflict;
  }, [conflict]);

  /** Conflict: overwrite the server copy with ours. */
  const overwriteRemote = useCallback(
    (full: Required<Patch>) => {
      if (!conflict) return;
      version.current = conflict.version;
      pending.current = full;
      blocked.current = false;
      setConflict(null);
      void flush();
    },
    [conflict, flush],
  );

  // Warn before leaving with unsaved work; flush on tab hide.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPending() || inFlight.current) e.preventDefault();
    };
    const onHide = () => document.visibilityState === "hidden" && void flush();
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  return { status, error, conflict, lastSavedAt, queue, flush, retry, acceptRemote, overwriteRemote };
}
