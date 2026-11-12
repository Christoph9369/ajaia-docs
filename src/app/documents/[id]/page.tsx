import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { getDocument } from "@/lib/documents";
import { AppError } from "@/lib/errors";
import { DocumentEditor } from "./DocumentEditor";

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  try {
    const doc = await getDocument(getDb(), user.id, id);
    return <DocumentEditor initial={doc} currentUser={{ id: user.id, name: user.name, email: user.email, color: user.color }} />;
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
}
