import { and, eq } from "drizzle-orm";
import type { DB } from ".";
import { documents, documentShares, users } from "./schema";

export const SEED_USERS = [
  { email: "alice@ajaia.dev", name: "Alice Mensah", color: "#4f46e5" },
  { email: "bob@ajaia.dev", name: "Bob Okafor", color: "#059669" },
  { email: "carol@ajaia.dev", name: "Carol Dubois", color: "#d97706" },
] as const;

const WELCOME_TITLE = "Welcome to Ajaia Docs";
const WELCOME_HTML = [
  "<h1>Welcome to Ajaia Docs</h1>",
  "<p>This document is owned by <strong>Alice</strong>. It is shared with <em>Bob (editor)</em> and <u>Carol (viewer)</u>.</p>",
  "<h2>Try it out</h2>",
  "<ul><li><p>Sign in as Bob and edit this text. Changes save automatically.</p></li>",
  "<li><p>Sign in as Carol. The editor is read-only for viewers.</p></li>",
  "<li><p>Sign in as Alice and open <strong>Share</strong> to change who has access.</p></li></ul>",
  "<h3>Things to do</h3>",
  "<ol><li><p>Create a document</p></li><li><p>Import a .txt, .md or .docx file</p></li><li><p>Share it with a teammate</p></li></ol>",
].join("");

/** Idempotent: safe to run on every deploy without overwriting edits reviewers have made. */
export async function seed(db: DB) {
  const rows = [];
  for (const u of SEED_USERS) {
    const [row] = await db
      .insert(users)
      .values(u)
      .onConflictDoUpdate({ target: users.email, set: { name: u.name, color: u.color } })
      .returning();
    rows.push(row);
  }
  const [alice, bob, carol] = rows;

  const existing = await db.query.documents.findFirst({
    where: and(eq(documents.ownerId, alice.id), eq(documents.title, WELCOME_TITLE)),
  });
  if (!existing) {
    const [welcome] = await db
      .insert(documents)
      .values({ title: WELCOME_TITLE, content: WELCOME_HTML, ownerId: alice.id })
      .returning();
    await db.insert(documentShares).values([
      { documentId: welcome.id, userId: bob.id, role: "editor" },
      { documentId: welcome.id, userId: carol.id, role: "viewer" },
    ]);
    await db.insert(documents).values({
      title: "Bob's private notes",
      content: "<p>Only Bob can see this until he shares it.</p>",
      ownerId: bob.id,
    });
  }
  return { alice, bob, carol };
}
