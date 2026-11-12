import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseJson, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { deleteDocument, getDocument, updateDocument } from "@/lib/documents";
import { updateDocumentSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireApiUser();
  const { id } = await params;
  return NextResponse.json(await getDocument(getDb(), user.id, id));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireApiUser();
  const { id } = await params;
  const input = await parseJson(req, updateDocumentSchema);
  return NextResponse.json(await updateDocument(getDb(), user.id, id, input));
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireApiUser();
  const { id } = await params;
  await deleteDocument(getDb(), user.id, id);
  return new NextResponse(null, { status: 204 });
});
