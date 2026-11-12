import { relations } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createId } from "@/lib/id";

/** Seeded demo accounts. Auth is mocked: a user "signs in" by picking an account. */
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(createId),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#4f46e5"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    title: text("title").notNull(),
    /** Sanitized HTML from the TipTap editor. The server re-sanitizes on every write. */
    content: text("content").notNull().default(""),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Incremented on every save. Used for optimistic concurrency: stale writes get a 409. */
    version: integer("version").notNull().default(1),
    /** Original filename when the document was created from an upload. */
    importedFrom: text("imported_from"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_owner_updated_idx").on(t.ownerId, t.updatedAt)],
);

export const shareRole = pgEnum("share_role", ["viewer", "editor"]);

export const documentShares = pgTable(
  "document_shares",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: shareRole("role").notNull().default("editor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("document_shares_doc_user_uq").on(t.documentId, t.userId),
    index("document_shares_user_idx").on(t.userId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  shares: many(documentShares),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  owner: one(users, { fields: [documents.ownerId], references: [users.id] }),
  shares: many(documentShares),
}));

export const documentSharesRelations = relations(documentShares, ({ one }) => ({
  document: one(documents, { fields: [documentShares.documentId], references: [documents.id] }),
  user: one(users, { fields: [documentShares.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentShare = typeof documentShares.$inferSelect;
export type ShareRole = (typeof shareRole.enumValues)[number];
