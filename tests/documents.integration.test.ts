/**
 * Exercises the real service layer against Postgres: ownership, sharing, role enforcement,
 * optimistic concurrency and server-side sanitization.
 * Requires TEST_DATABASE_URL (see .env.example). Skipped otherwise.
 */
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, type DB } from "@/db";
import { seed } from "@/db/seed";
import {
  createDocument,
  deleteDocument,
  getDocument,
  listCollaborators,
  listDocuments,
  removeCollaborator,
  shareDocument,
  updateDocument,
} from "@/lib/documents";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("documents service (Postgres)", () => {
  let db: DB;
  let pool: Pool;
  let alice: { id: string }, bob: { id: string }, carol: { id: string };

  beforeAll(async () => {
    ({ db, pool } = createDb(url!));
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  beforeEach(async () => {
    await db.execute(sql`truncate document_shares, documents, users cascade`);
    ({ alice, bob, carol } = await seed(db));
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("keeps a document private until it is shared, then lists it under 'shared'", async () => {
    const { id } = await createDocument(db, alice.id, { title: "Roadmap", content: "<p>secret</p>" });

    await expect(getDocument(db, bob.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await listDocuments(db, bob.id)).shared.map((d) => d.id)).not.toContain(id);

    await shareDocument(db, alice.id, id, { email: "bob@ajaia.dev", role: "editor" });

    const bobs = await listDocuments(db, bob.id);
    const entry = bobs.shared.find((d) => d.id === id);
    expect(entry).toMatchObject({ access: "editor", owner: { name: "Alice Mensah" } });
    expect(bobs.owned.map((d) => d.id)).not.toContain(id);

    const alices = await listDocuments(db, alice.id);
    expect(alices.owned.find((d) => d.id === id)).toMatchObject({ access: "owner", collaboratorCount: 1 });
  });

  it("lets editors save, blocks viewers, and only lets the owner share or delete", async () => {
    const { id } = await createDocument(db, alice.id, { title: "Spec" });
    await shareDocument(db, alice.id, id, { email: "bob@ajaia.dev", role: "editor" });
    await shareDocument(db, alice.id, id, { email: "carol@ajaia.dev", role: "viewer" });

    const saved = await updateDocument(db, bob.id, id, { content: "<p>bob was here</p>", version: 1 });
    expect(saved.version).toBe(2);
    expect((await getDocument(db, carol.id, id)).content).toBe("<p>bob was here</p>");

    await expect(updateDocument(db, carol.id, id, { content: "<p>nope</p>", version: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(updateDocument(db, carol.id, id, { title: "nope", version: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(shareDocument(db, bob.id, id, { email: "carol@ajaia.dev", role: "editor" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(deleteDocument(db, bob.id, id)).rejects.toMatchObject({ code: "FORBIDDEN" });

    await deleteDocument(db, alice.id, id);
    await expect(getDocument(db, alice.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a stale save with CONFLICT and returns the current copy", async () => {
    const { id } = await createDocument(db, alice.id, { title: "Race" });
    await shareDocument(db, alice.id, id, { email: "bob@ajaia.dev", role: "editor" });

    // Both opened version 1. Alice saves first.
    await updateDocument(db, alice.id, id, { content: "<p>alice</p>", version: 1 });
    const stale = updateDocument(db, bob.id, id, { content: "<p>bob</p>", version: 1 });

    await expect(stale).rejects.toMatchObject({ code: "CONFLICT", details: { current: { content: "<p>alice</p>", version: 2 } } });
    expect((await getDocument(db, alice.id, id)).content).toBe("<p>alice</p>");
  });

  it("changes roles in place, revokes access, and lets collaborators leave", async () => {
    const { id } = await createDocument(db, alice.id, {});
    await shareDocument(db, alice.id, id, { email: "bob@ajaia.dev", role: "viewer" });
    await shareDocument(db, alice.id, id, { email: "bob@ajaia.dev", role: "editor" });
    expect(await listCollaborators(db, alice.id, id)).toEqual([expect.objectContaining({ email: "bob@ajaia.dev", role: "editor" })]);

    await shareDocument(db, alice.id, id, { email: "carol@ajaia.dev", role: "viewer" });
    await expect(removeCollaborator(db, carol.id, id, bob.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await removeCollaborator(db, carol.id, id, carol.id); // leave
    await removeCollaborator(db, alice.id, id, bob.id); // revoke
    await expect(getDocument(db, bob.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await listCollaborators(db, alice.id, id)).toEqual([]);
  });

  it("validates share targets", async () => {
    const { id } = await createDocument(db, alice.id, {});
    await expect(shareDocument(db, alice.id, id, { email: "nobody@ajaia.dev", role: "editor" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(shareDocument(db, alice.id, id, { email: "alice@ajaia.dev", role: "editor" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("sanitizes content on the server regardless of what the client sends", async () => {
    const { id } = await createDocument(db, alice.id, { content: '<p onclick="x()">hi<script>alert(1)</script></p>' });
    expect((await getDocument(db, alice.id, id)).content).toBe("<p>hi</p>");
    await updateDocument(db, alice.id, id, { content: '<h2>ok</h2><img src=x onerror="alert(1)">', version: 1 });
    expect((await getDocument(db, alice.id, id)).content).toBe("<h2>ok</h2>");
  });
});
