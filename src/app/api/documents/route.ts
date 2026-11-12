import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseJson, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { createDocument, listDocuments } from "@/lib/documents";
import { createDocumentSchema } from "@/lib/validation";

export const GET = route(async () => {
  const user = await requireApiUser();
  return NextResponse.json(await listDocuments(getDb(), user.id));
});

export const POST = route(async (req) => {
  const user = await requireApiUser();
  const input = await parseJson(req, createDocumentSchema);
  const doc = await createDocument(getDb(), user.id, input);
  return NextResponse.json(doc, { status: 201 });
});
