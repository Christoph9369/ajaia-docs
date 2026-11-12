import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { createDocument } from "@/lib/documents";
import { AppError } from "@/lib/errors";
import { convertUpload, MAX_IMPORT_BYTES } from "@/lib/import";

/** Upload a .txt / .md / .docx file and turn it into a new editable document. */
export const POST = route(async (req) => {
  const user = await requireApiUser();

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_IMPORT_BYTES + 64 * 1024) {
    throw new AppError("FILE_TOO_LARGE", `Files must be ${MAX_IMPORT_BYTES / 1024 / 1024} MB or smaller.`);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new AppError("VALIDATION", "Expected a multipart form upload.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("VALIDATION", "Choose a file to upload.");

  const { title, html } = await convertUpload(file.name, Buffer.from(await file.arrayBuffer()));
  const doc = await createDocument(getDb(), user.id, { title, content: html, importedFrom: file.name.slice(0, 255) });
  return NextResponse.json(doc, { status: 201 });
});
