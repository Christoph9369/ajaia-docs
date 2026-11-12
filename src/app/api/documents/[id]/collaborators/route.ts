import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseJson, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { listCollaborators, shareDocument } from "@/lib/documents";
import { shareSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireApiUser();
  const { id } = await params;
  return NextResponse.json({ collaborators: await listCollaborators(getDb(), user.id, id) });
});

/** Grant (or change) access by email. Owner only. */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireApiUser();
  const { id } = await params;
  const input = await parseJson(req, shareSchema);
  return NextResponse.json({ collaborators: await shareDocument(getDb(), user.id, id, input) });
});
