# AI workflow note

## Tools used

- **Claude (Anthropic) as an agentic coding assistant.** It worked in a sandbox with a shell, Node, a local Postgres and headless Chrome, so it could write code, run it and test it, not just suggest snippets.
- My own review in the editor and browser for product decisions, UX checks and the final read-through.

## Where AI materially sped things up

- **Scaffolding and boilerplate.** Project config, the Drizzle schema and migration, route handlers, the Zod schemas and the Tailwind UI shell took minutes instead of an hour or two.
- **The test suite.** It drafted the permission matrix, the import edge cases (empty, oversized, corrupt .docx, XSS payloads) and the Postgres integration scenarios, and generated a real `.docx` fixture with python-docx.
- **Verification loops.** It ran an API sweep with `curl` (unauthenticated, forged cookie, viewer writes, stale versions, bad JSON, unsupported uploads). It also wrote a Playwright script that drives the whole flow across three users and takes the screenshots in `docs/screenshots/`.
- **Docs.** It produced first drafts of the README and architecture note, which I then edited.

## What I changed or rejected

- **Prisma → Drizzle.** The first plan used Prisma. Its install step downloads native engine binaries, and that failed in the sandbox. Rather than adding a workaround, I switched to Drizzle, which is pure TS and has no binary step. It is also simpler for reviewers to run.
- **Dependency versions.** The scaffold initially installed Next 15 and Zod 3. `npm audit` flagged high-severity advisories in both, so I moved to Next 16 and Zod 4 before writing app code. I pinned TypeScript 5, because npm's latest (TS 7) isn't something I wanted to debug Next's type-checking against under time pressure.
- **Storage format.** I considered storing ProseMirror JSON. I chose sanitized HTML instead (one format across import, editor and DB, with server-side sanitization). The reasoning is in ARCHITECTURE.md.
- **Last-write-wins autosave.** I rejected a plain debounced `PATCH` and required optimistic concurrency (`version` check → 409 → explicit choice). A plain debounce silently loses a collaborator's edits.
- **Native `confirm()` for delete.** I replaced it with an inline confirm button, which is friendlier and testable.
- **An accessibility bug caught by the E2E test.** The dashboard sections used `aria-labelledby` IDs with spaces (`"Shared with me-h"`), which assistive tech reads as several IDs. The Playwright test couldn't find the region by name, which exposed it, and I fixed it with slugged IDs.
- **Error message copy.** I rewrote the generated text to be specific and actionable (e.g. *"“.png” files aren't supported. Upload a .txt, .md or .docx file."*).

## How I verified correctness, UX and reliability

1. **Automated tests:** 32 Vitest tests, including integration tests against a real Postgres (not mocks) for every sharing and permission rule and for the conflict path.
2. **Type safety:** `tsc --noEmit` plus a production `next build`, both of which run in CI.
3. **API contract sweep:** `curl` checks of each status code (401/403/404/409/415/400) against the production build.
4. **Browser E2E:** `e2e/smoke.py` creates a doc, applies every formatting option, reloads to confirm persistence, shares as editor and viewer, imports a .docx, rejects an .exe, makes Bob edit, forces a conflict and resolves it, and confirms Carol's editor is read-only. It also checks for console and page errors.
5. **Visual review:** I read each screenshot for layout, hierarchy and state clarity (role badges, save status, read-only banner).
