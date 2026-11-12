# Architecture note

## What I optimized for

The brief rewards depth in a few areas over shallow coverage. I picked the three things that decide whether a doc tool is trustworthy and put most of the time there:

1. **Your words don't get lost.** This means debounced autosave, a visible save state, retry after a failed save, and conflict detection when two people save the same version.
2. **Sharing is real.** Access is enforced in one service layer on the server, not by hiding buttons, and it is covered by integration tests against Postgres.
3. **Formatting round-trips.** What you format is exactly what comes back after a refresh, an import or another user's edit.

The deliberate cuts are listed at the end.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| App | **Next.js 16 (App Router), TypeScript** | One deployable unit for UI and API, with server components for initial data. It deploys for free on Vercel. |
| Editor | **TipTap 3** (ProseMirror) | A mature rich-text model with schema-enforced structure and good keyboard behaviour. I avoided `contenteditable` hand-rolling. |
| DB | **Postgres + Drizzle ORM** | Relational data (users ↔ documents ↔ shares) with SQL migrations checked into `drizzle/`. Free on Neon. |
| Validation | **Zod** | Every API input is parsed before it reaches the service layer. |
| Import | `marked` (Markdown) and `mammoth` (.docx) → `sanitize-html` | Each converts to the same HTML subset the editor speaks. |
| Tests | **Vitest** | Unit tests plus integration tests against a real Postgres. A Playwright smoke test covers the UI flow. |

I first planned to use Prisma, then switched to Drizzle. Prisma 6 downloads native engine binaries during install. Drizzle is pure TypeScript, has no binary step and works with any Postgres, so it was the more portable choice for reviewers and CI.

## Data model

```
users(id, email unique, name, color)
documents(id, title, content, owner_id → users, version, imported_from, created_at, updated_at)
document_shares(document_id → documents, user_id → users, role 'viewer'|'editor', unique(document_id, user_id))
```

- **Ownership** is a column, not a share row, so a document can never lose its owner.
- **`version`** is a counter incremented on every write (see concurrency below).
- Deleting a document cascades to its shares.

## Access control

- `lib/permissions.ts` is a small pure function: `resolveAccess(doc, shares, user)` returns `owner | editor | viewer | null`, and `can(access, action)` checks it against a fixed matrix:

  | | view | edit/rename | share | delete |
  |---|---|---|---|---|
  | owner | ✓ | ✓ | ✓ | ✓ |
  | editor | ✓ | ✓ | | |
  | viewer | ✓ | | | |

- `lib/documents.ts` is the only code that touches documents. Every function takes the acting user's ID and checks access first, and API routes are thin wrappers around it. This makes the rules testable without HTTP, and a new endpoint can't forget a check.
- Having no access returns **404, not 403**, so document IDs can't be probed.
- Errors are `AppError(code, message)` values that map to HTTP statuses, so the UI always gets a human-readable message.

## Persistence format: sanitized HTML

I store documents as HTML, not ProseMirror JSON:

- TipTap loads and emits HTML natively, and both file importers already produce HTML, so there is one format end to end.
- It is readable in the database and trivially exportable.
- **The server sanitizes every write** against an allow-list matching the editor's schema (`p, h1–h3, strong, em, u, s, ul, ol, li, blockquote, code, pre, a`). A malicious client or a crafted .md/.docx can't store scripts, event handlers or `javascript:` links. Tests cover this.

The trade-off is that JSON would be a better base for real-time collaboration (CRDT/OT). If I added that, I would move to Yjs documents rather than either format.

## Autosave and concurrency

`useAutosave` batches changes and sends **at most one request at a time**. Each `PATCH` includes the `version` the client last saw, and the update is a single conditional statement:

```sql
UPDATE documents SET ..., version = version + 1 WHERE id = $1 AND version = $2
```

If no row updates, someone else saved first. The server returns **409** with the current copy, and the UI offers **Load their version** or **Keep mine**. Without this, the last writer silently erases the other person's work. I think that is the worst failure a shared-doc tool can have, and preventing it is cheap.

Failed saves keep the unsent changes in memory and show a **Retry** action. The tab warns before closing with unsaved work and flushes on tab hide.

## File upload

**Import creates a new document.** I chose this because it is the most product-relevant flow: "I have a doc elsewhere and want it here."

- Supported types are `.txt`, `.md` and `.docx`, up to 5 MB. This is stated in the UI, in the README and in the error message.
- The type is checked on both the client (fast feedback) and the server (the authority). Empty, oversized, corrupt and password-protected files return specific messages.
- Conversion is server-side, and the result goes through the same sanitizer as normal saves. The original filename is kept as an "Imported from …" label.

## Auth (intentionally mocked)

Users pick a seeded account. The session is an **HMAC-signed, httpOnly cookie** holding the user ID. There are no passwords, but the cookie can't be forged or edited to impersonate someone else (covered in `tests/session.test.ts`). Swapping in real auth (e.g. Auth.js with magic links) only changes `lib/auth.ts`.

## What I deprioritized, and why

| Cut | Reason |
| --- | --- |
| Real-time co-editing (Yjs/WebSockets) | It is the biggest single cost and needs a stateful server. Conflict detection gives safety without it. |
| Real authentication | It is not what's being evaluated. The signed cookie keeps the sharing model honest. |
| Invite-by-email for non-users | Without email delivery it would be a fake flow. |
| Attachments, export, comments, version history | These are stretch items. I chose **role-based sharing (viewer/editor)** as my one stretch because it deepens the core sharing requirement. |
| Pagination and search on the dashboard | They are unnecessary at demo scale. The query is indexed on `(owner_id, updated_at)`. |

## Next 2–4 hours

1. **Live presence and remote-change notice.** Poll (or use SSE) for the doc version, show who else is viewing, and offer "Bob updated this. Reload?" before a conflict happens.
2. **Import into an existing document** at the cursor, reusing `convertUpload`.
3. **Export to Markdown/.docx**, plus a simple version history (snapshot on each Nth save).
4. **Real auth** (Auth.js email magic link) and share-by-link with a role.
