/**
 * Document + sharing service. Every function takes the acting user's id and enforces access
 * itself, so API routes stay thin and the rules are testable without HTTP.
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { documents, documentShares, users, type ShareRole } from "@/db/schema";
import { AppError } from "./errors";
import { can, resolveAccess, type Access, type Action } from "./permissions";
import { htmlToSnippet, sanitizeDocumentHtml } from "./sanitize";

export const DEFAULT_TITLE = "Untitled document";

export interface DocumentSummary {
  id: string;
  title: string;
  snippet: string;
  updatedAt: string;
  owner: { id: string; name: string };
  access: Exclude<Access, null>;
  collaboratorCount: number;
  importedFrom: string | null;
}

export interface DocumentDetail {
  id: string;
  title: string;
  content: string;
  version: number;
  updatedAt: string;
  importedFrom: string | null;
  owner: { id: string; name: string; email: string; color: string };
  access: Exclude<Access, null>;
}

export interface Collaborator {
  userId: string;
  name: string;
  email: string;
  color: string;
  role: ShareRole;
}

async function loadWithAccess(db: DB, documentId: string, userId: string) {
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
    with: { owner: true, shares: { columns: { userId: true, role: true } } },
  });
  const access = doc ? resolveAccess(doc, doc.shares, userId) : null;
  // Same error whether the doc doesn't exist or you can't see it, so ids can't be probed.
  if (!doc || access === null) throw new AppError("NOT_FOUND", "Document not found.");
  return { doc, access };
}

function assertCan(access: Access, action: Action) {
  if (!can(access, action)) {
    const msg: Record<Action, string> = {
      view: "You don't have access to this document.",
      edit: "You have view-only access to this document.",
      rename: "You have view-only access to this document.",
      share: "Only the owner can change sharing.",
      delete: "Only the owner can delete this document.",
    };
    throw new AppError("FORBIDDEN", msg[action]);
  }
}

export async function listDocuments(db: DB, userId: string) {
  const shareCounts = db
    .select({ documentId: documentShares.documentId, n: sql<number>`count(*)::int`.as("n") })
    .from(documentShares)
    .groupBy(documentShares.documentId)
    .as("share_counts");

  const sharedIds = db
    .select({ id: documentShares.documentId })
    .from(documentShares)
    .where(eq(documentShares.userId, userId));

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      content: documents.content,
      updatedAt: documents.updatedAt,
      importedFrom: documents.importedFrom,
      ownerId: users.id,
      ownerName: users.name,
      collaboratorCount: sql<number>`coalesce(${shareCounts.n}, 0)`,
      myRole: sql<ShareRole | null>`(select role from document_shares s where s.document_id = ${documents.id} and s.user_id = ${userId})`,
    })
    .from(documents)
    .innerJoin(users, eq(users.id, documents.ownerId))
    .leftJoin(shareCounts, eq(shareCounts.documentId, documents.id))
    .where(sql`${documents.ownerId} = ${userId} or ${inArray(documents.id, sharedIds)}`)
    .orderBy(desc(documents.updatedAt));

  const toSummary = (r: (typeof rows)[number]): DocumentSummary => ({
    id: r.id,
    title: r.title,
    snippet: htmlToSnippet(r.content),
    updatedAt: r.updatedAt.toISOString(),
    owner: { id: r.ownerId, name: r.ownerName },
    access: r.ownerId === userId ? "owner" : (r.myRole ?? "viewer"),
    collaboratorCount: Number(r.collaboratorCount),
    importedFrom: r.importedFrom,
  });

  return {
    owned: rows.filter((r) => r.ownerId === userId).map(toSummary),
    shared: rows.filter((r) => r.ownerId !== userId).map(toSummary),
  };
}

export async function getDocument(db: DB, userId: string, documentId: string): Promise<DocumentDetail> {
  const { doc, access } = await loadWithAccess(db, documentId, userId);
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    version: doc.version,
    updatedAt: doc.updatedAt.toISOString(),
    importedFrom: doc.importedFrom,
    owner: { id: doc.owner.id, name: doc.owner.name, email: doc.owner.email, color: doc.owner.color },
    access,
  };
}

export async function createDocument(
  db: DB,
  userId: string,
  input: { title?: string; content?: string; importedFrom?: string },
) {
  const [doc] = await db
    .insert(documents)
    .values({
      ownerId: userId,
      title: input.title?.trim() || DEFAULT_TITLE,
      content: sanitizeDocumentHtml(input.content ?? ""),
      importedFrom: input.importedFrom ?? null,
    })
    .returning({ id: documents.id });
  return doc;
}

export async function updateDocument(
  db: DB,
  userId: string,
  documentId: string,
  input: { title?: string; content?: string; version: number },
) {
  const { access } = await loadWithAccess(db, documentId, userId);
  if (input.content !== undefined) assertCan(access, "edit");
  if (input.title !== undefined) assertCan(access, "rename");

  const patch: Partial<typeof documents.$inferInsert> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.content !== undefined) patch.content = sanitizeDocumentHtml(input.content);

  // Optimistic concurrency: only write if nobody else saved since the client loaded this version.
  const [updated] = await db
    .update(documents)
    .set({ ...patch, version: sql`${documents.version} + 1`, updatedAt: new Date() })
    .where(and(eq(documents.id, documentId), eq(documents.version, input.version)))
    .returning({ version: documents.version, updatedAt: documents.updatedAt, title: documents.title });

  if (!updated) {
    const current = await getDocument(db, userId, documentId);
    throw new AppError("CONFLICT", "This document was changed by someone else since you opened it.", {
      current,
    });
  }
  return { version: updated.version, updatedAt: updated.updatedAt.toISOString(), title: updated.title };
}

export async function deleteDocument(db: DB, userId: string, documentId: string) {
  const { access } = await loadWithAccess(db, documentId, userId);
  assertCan(access, "delete");
  await db.delete(documents).where(eq(documents.id, documentId));
}

export async function listCollaborators(db: DB, userId: string, documentId: string): Promise<Collaborator[]> {
  await loadWithAccess(db, documentId, userId);
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      color: users.color,
      role: documentShares.role,
    })
    .from(documentShares)
    .innerJoin(users, eq(users.id, documentShares.userId))
    .where(eq(documentShares.documentId, documentId))
    .orderBy(users.name);
}

export async function shareDocument(
  db: DB,
  userId: string,
  documentId: string,
  input: { email: string; role: ShareRole },
) {
  const { doc, access } = await loadWithAccess(db, documentId, userId);
  assertCan(access, "share");

  const target = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (!target) {
    throw new AppError("NOT_FOUND", `No account found for ${input.email}. In this demo you can share with the seeded users.`);
  }
  if (target.id === doc.ownerId) throw new AppError("VALIDATION", "You already own this document.");

  await db
    .insert(documentShares)
    .values({ documentId, userId: target.id, role: input.role })
    .onConflictDoUpdate({ target: [documentShares.documentId, documentShares.userId], set: { role: input.role } });

  return listCollaborators(db, userId, documentId);
}

export async function removeCollaborator(db: DB, userId: string, documentId: string, collaboratorId: string) {
  const { access } = await loadWithAccess(db, documentId, userId);
  // Owners can remove anyone. A collaborator can remove themselves ("leave").
  if (collaboratorId !== userId) assertCan(access, "share");
  await db
    .delete(documentShares)
    .where(and(eq(documentShares.documentId, documentId), eq(documentShares.userId, collaboratorId)));
}

export async function listUsers(db: DB) {
  return db
    .select({ id: users.id, name: users.name, email: users.email, color: users.color })
    .from(users)
    .orderBy(users.name);
}
