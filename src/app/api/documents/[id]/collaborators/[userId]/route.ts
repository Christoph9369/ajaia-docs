import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { removeCollaborator } from "@/lib/documents";

type Ctx = { params: Promise<{ id: string; userId: string }> };

/** Revoke access. Owners can remove anyone; a collaborator can remove themselves. */
export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireApiUser();
  const { id, userId } = await params;
  await removeCollaborator(getDb(), user.id, id, userId);
  return new NextResponse(null, { status: 204 });
});
