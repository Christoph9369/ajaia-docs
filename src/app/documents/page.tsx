import { getDb } from "@/db";
import { Logo, UserMenu } from "@/components/AppHeader";
import { requirePageUser } from "@/lib/auth";
import { listDocuments } from "@/lib/documents";
import { Dashboard } from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const user = await requirePageUser();
  const { owned, shared } = await listDocuments(getDb(), user.id);
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Logo />
          <UserMenu user={user} />
        </div>
      </header>
      <Dashboard owned={owned} shared={shared} />
    </>
  );
}
