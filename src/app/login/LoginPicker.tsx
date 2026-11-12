"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Avatar } from "@/components/ui";
import { api, ApiError } from "@/lib/client-api";

type DemoUser = { id: string; name: string; email: string; color: string };

export function LoginPicker({ users }: { users: DemoUser[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(email: string) {
    setPending(email);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", json: { email } });
      router.push("/documents");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign-in failed.");
      setPending(null);
    }
  }

  if (users.length === 0) {
    return <Alert>No demo accounts found. Run <code>npm run db:seed</code> and reload.</Alert>;
  }

  return (
    <div className="space-y-3">
      {error && <Alert onDismiss={() => setError(null)}>{error}</Alert>}
      <ul className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        {users.map((u) => (
          <li key={u.id} className="border-b border-line last:border-0">
            <button
              type="button"
              onClick={() => signIn(u.email)}
              disabled={pending !== null}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              <Avatar name={u.name} color={u.color} size={36} />
              <span className="flex-1">
                <span className="block text-sm font-medium">{u.name}</span>
                <span className="block text-xs text-muted">{u.email}</span>
              </span>
              <span className="flex items-center gap-1 text-sm text-accent">
                {pending === u.email ? "Signing in…" : "Continue"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
