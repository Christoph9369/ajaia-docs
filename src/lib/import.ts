import mammoth from "mammoth";
import { marked } from "marked";
import { AppError } from "./errors";
import { sanitizeDocumentHtml } from "./sanitize";

/** Shown in the UI and README. Keep the three in sync. */
export const SUPPORTED_IMPORT_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB

type Ext = (typeof SUPPORTED_IMPORT_EXTENSIONS)[number];

export interface ImportedDocument {
  title: string;
  html: string;
}

function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

function titleFrom(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return (base || "Imported document").slice(0, 200);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Plain text: blank lines separate paragraphs, single newlines become <br>. */
export function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Converts an uploaded file into sanitized HTML for a new document.
 * Throws AppError for unsupported, oversized, empty or corrupt files.
 */
export async function convertUpload(filename: string, data: Buffer): Promise<ImportedDocument> {
  const ext = extensionOf(filename);
  if (!(SUPPORTED_IMPORT_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new AppError(
      "UNSUPPORTED_FILE",
      `“${ext || filename}” files aren't supported. Upload a .txt, .md or .docx file.`,
    );
  }
  if (data.byteLength > MAX_IMPORT_BYTES) {
    throw new AppError("FILE_TOO_LARGE", `Files must be ${MAX_IMPORT_BYTES / 1024 / 1024} MB or smaller.`);
  }
  if (data.byteLength === 0) {
    throw new AppError("VALIDATION", "That file is empty.");
  }

  let rawHtml: string;
  switch (ext as Ext) {
    case ".txt":
      rawHtml = textToHtml(data.toString("utf8"));
      break;
    case ".md":
      rawHtml = await marked.parse(data.toString("utf8"), { gfm: true });
      break;
    case ".docx":
      try {
        rawHtml = (await mammoth.convertToHtml({ buffer: data })).value;
      } catch {
        throw new AppError("UNSUPPORTED_FILE", "That .docx file couldn't be read. It may be corrupt or password-protected.");
      }
      break;
  }

  const html = sanitizeDocumentHtml(rawHtml);
  if (!html) throw new AppError("VALIDATION", "No readable text was found in that file.");
  return { title: titleFrom(filename), html };
}
