import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { convertUpload, MAX_IMPORT_BYTES, textToHtml } from "@/lib/import";
import { htmlToSnippet, sanitizeDocumentHtml } from "@/lib/sanitize";

const buf = (s: string) => Buffer.from(s, "utf8");

describe("convertUpload", () => {
  it("turns plain text paragraphs into <p> and escapes HTML", async () => {
    const out = await convertUpload("meeting_notes.txt", buf("Hello <b>world</b>\nline two\n\nSecond para"));
    expect(out.title).toBe("meeting notes");
    expect(out.html).toBe("<p>Hello &lt;b&gt;world&lt;/b&gt;<br />line two</p><p>Second para</p>");
  });

  it("renders Markdown headings, emphasis and lists", async () => {
    const out = await convertUpload("Plan.md", buf("# Title\n\nSome **bold** and _italic_.\n\n- one\n- two\n\n1. first"));
    expect(out.title).toBe("Plan");
    expect(out.html).toContain("<h1>Title</h1>");
    expect(out.html).toContain("<strong>bold</strong>");
    expect(out.html).toContain("<em>italic</em>");
    expect(out.html).toMatch(/<ul>\s*<li>one<\/li>/);
    expect(out.html).toContain("<ol>");
  });

  it("extracts headings, bold text and bullets from a real .docx", async () => {
    const data = readFileSync(path.join(__dirname, "fixtures/sample.docx"));
    const out = await convertUpload("sample.docx", data);
    expect(out.html).toContain("<h1>Quarterly Plan</h1>");
    expect(out.html).toContain("<strong>editor</strong>");
    expect(out.html).toMatch(/<ul><li>Draft spec<\/li><li>Review<\/li><\/ul>/);
  });

  it("strips scripts and event handlers from imported Markdown", async () => {
    const out = await convertUpload("x.md", buf('Hi<script>alert(1)</script> <img src=x onerror="alert(1)"> [a](javascript:alert(1))'));
    expect(out.html).not.toMatch(/script|onerror|javascript:|<img/i);
  });

  it.each([
    ["photo.png", "UNSUPPORTED_FILE"],
    ["noext", "UNSUPPORTED_FILE"],
  ])("rejects %s", async (name, code) => {
    await expect(convertUpload(name, buf("x"))).rejects.toMatchObject({ code });
  });

  it("rejects empty, oversized and corrupt files with user-facing errors", async () => {
    await expect(convertUpload("a.txt", Buffer.alloc(0))).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(convertUpload("a.txt", Buffer.alloc(MAX_IMPORT_BYTES + 1, 97))).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
    await expect(convertUpload("a.docx", buf("not a zip"))).rejects.toBeInstanceOf(AppError);
  });
});

describe("sanitizeDocumentHtml", () => {
  it("keeps the formatting the editor supports", () => {
    const html = "<h2>T</h2><p><strong>b</strong><em>i</em><u>u</u></p><ul><li><p>x</p></li></ul><ol><li><p>y</p></li></ol>";
    expect(sanitizeDocumentHtml(html)).toBe(html);
  });
  it("drops unsupported tags and attributes", () => {
    expect(sanitizeDocumentHtml('<p style="color:red" onclick="x()">a<iframe src="//evil"></iframe></p>')).toBe("<p>a</p>");
  });
});

describe("helpers", () => {
  it("textToHtml normalises Windows line endings", () => {
    expect(textToHtml("a\r\n\r\nb")).toBe("<p>a</p><p>b</p>");
  });
  it("htmlToSnippet drops a leading heading that repeats the title", () => {
    expect(htmlToSnippet("<h1>My Plan</h1><p>First step.</p>", 140, "my plan")).toBe("First step.");
    expect(htmlToSnippet("<h1>Other</h1><p>First step.</p>", 140, "My Plan")).toBe("Other First step.");
  });

  it("htmlToSnippet produces readable plain text", () => {
    expect(htmlToSnippet("<h1>Hi</h1><p>there &amp; you</p>")).toBe("Hi there & you");
  });
});
