"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import { Avatar } from "./ui";

export function Logo() {
  return (
    <Link href="/documents" className="flex items-center gap-2 font-semibold tracking-tight text-ink">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm text-white">A</span>
      <span>Ajaia Docs</span>
    </Link>
  );
}

export function UserMenu({ user }: { user: { name: string; email: string; color: string } }) {
  const router = useRouter();
  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <div className="text-sm font-medium leading-tight">{user.name}</div>
        <div className="text-xs text-muted">{user.email}</div>
      </div>
      <Avatar name={user.name} color={user.color} size={32} />
      <button type="button" onClick={signOut} className="rounded-md px-2 py-1 text-sm text-muted hover:bg-black/5 hover:text-ink">
        Switch user
      </button>
    </div>
  );
}
