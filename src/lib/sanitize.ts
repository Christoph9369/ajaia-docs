import sanitizeHtml from "sanitize-html";

/**
 * The editor only produces this subset of HTML. Everything outside it is stripped on the
 * server, so a malicious client (or an imported file) can never store scripts or event handlers.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "h1", "h2", "h3",
    "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li", "blockquote", "pre", "code", "a",
  ],
  allowedAttributes: { a: ["href", "target", "rel"], ol: ["start"] },
  allowedSchemes: ["http", "https", "mailto"],
  // Map headings the editor doesn't support down to the closest supported level.
  transformTags: {
    h4: "h3",
    h5: "h3",
    h6: "h3",
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
  // Drop the contents of these entirely (not just the tags).
  nonTextTags: ["style", "script", "textarea", "noscript", "title", "head"],
};

export function sanitizeDocumentHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS).trim();
}

/** Plain-text snippet for dashboard previews. */
export function htmlToSnippet(html: string, max = 140): string {
  const text = sanitizeHtml(html.replace(/<\/(p|h[1-6]|li)>/g, " "), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
