import type { ShareRole } from "@/db/schema";

/** What a given user is to a given document. `null` means no access at all. */
export type Access = "owner" | ShareRole | null;

export type Action = "view" | "edit" | "rename" | "share" | "delete";

const ALLOWED: Record<Exclude<Access, null>, ReadonlySet<Action>> = {
  owner: new Set(["view", "edit", "rename", "share", "delete"]),
  editor: new Set(["view", "edit", "rename"]),
  viewer: new Set(["view"]),
};

export function resolveAccess(
  doc: { ownerId: string },
  shares: ReadonlyArray<{ userId: string; role: ShareRole }>,
  userId: string,
): Access {
  if (doc.ownerId === userId) return "owner";
  return shares.find((s) => s.userId === userId)?.role ?? null;
}

export function can(access: Access, action: Action): boolean {
  return access !== null && ALLOWED[access].has(action);
}
