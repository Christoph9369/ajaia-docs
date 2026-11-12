import { getDb } from "@/db";
import { AppHeader } from "@/components/AppHeader";
import { requirePageUser } from "@/lib/auth";
import { listDocuments } from "@/lib/documents";
import { Dashboard } from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const user = await requirePageUser();
  const { owned, shared } = await listDocuments(getDb(), user.id);
  return (
    <>
      <AppHeader user={user} />
      <Dashboard owned={owned} shared={shared} />
    </>
  );
}
