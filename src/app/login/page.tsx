import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { listUsers } from "@/lib/documents";
import { LoginPicker } from "./LoginPicker";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/documents");
  const users = await listUsers(getDb());
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-lg font-semibold text-white">
            A
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to Ajaia Docs</h1>
          <p className="mt-2 text-sm text-muted">
            Demo mode: pick a seeded account. Sign in as different users to try sharing.
          </p>
        </div>
        <LoginPicker users={users} />
      </div>
    </main>
  );
}
