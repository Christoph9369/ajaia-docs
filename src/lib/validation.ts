import { z } from "zod";

export const MAX_TITLE_LENGTH = 200;
export const MAX_CONTENT_BYTES = 1_000_000; // ~1 MB of HTML

const title = z
  .string()
  .trim()
  .min(1, "Title can't be empty.")
  .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);

const content = z
  .string()
  .refine((s) => Buffer.byteLength(s, "utf8") <= MAX_CONTENT_BYTES, "Document is too large to save (1 MB limit).");

export const createDocumentSchema = z.object({
  title: title.optional(),
  content: content.optional(),
});

export const updateDocumentSchema = z
  .object({
    title: title.optional(),
    content: content.optional(),
    /** The version the client last saw. Required so concurrent edits can't silently overwrite each other. */
    version: z.number().int().positive(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, "Nothing to update.");

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(["viewer", "editor"]).default("editor"),
});

export const updateShareSchema = z.object({ role: z.enum(["viewer", "editor"]) });

export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email() });
