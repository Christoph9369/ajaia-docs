# Ajaia Docs

Lightweight collaborative document editor (take-home). Next.js 16 App Router, TypeScript, TipTap 3, Postgres + Drizzle, Zod, Vitest.
Read `README.md` for features and scripts, `ARCHITECTURE.md` for design decisions and deliberate cuts.

## Commands

- `npm run dev` / `build` / `start`: Next.js
- `npm test`: Vitest (integration tests need Postgres via `TEST_DATABASE_URL`)
- `npm run typecheck`: `tsc --noEmit`
- `npm run db:setup`: migrate and seed demo users (alice, bob, carol @ajaia.dev)
- `npm run db:generate`: new migration after editing `src/db/schema.ts`
- Requires Node 22.12+ (vitest 5, sanitize-html). Use `nvm use 22`.

## Project rules

- Access control lives in the server service layer, never only in the UI. Inaccessible documents return 404.
- Every API input is parsed with Zod before reaching the service layer.
- Document content is stored as sanitized HTML; sanitize on the server regardless of what the client sends.
- Saves use optimistic versioning; a stale save returns CONFLICT with the current copy.
- Never print or commit `.env` values or credentials.
- Do not push to a remote. The user pushes.

## How to work (Karpathy guidelines)

Project rules above take precedence over these general guidelines.

1. **Think before coding.** State assumptions; if uncertain, ask. Present multiple interpretations instead of picking silently. Push back when a simpler approach exists. If something is unclear, stop and name it.
2. **Simplicity first.** Minimum code that solves the problem. No unrequested features, single-use abstractions, speculative configurability, or error handling for impossible cases. If 200 lines could be 50, rewrite.
3. **Surgical changes.** Touch only what you must; match existing style. Don't refactor or "improve" adjacent code. Remove only orphans your change created; mention unrelated dead code instead of deleting it. Every changed line should trace to the request.
4. **Goal-driven execution.** Turn tasks into verifiable goals (bug → failing test first, then pass; refactor → tests green before and after). For multi-step work, state a short plan with a verify step each, and loop until verified.

## Agent skills

### Issue tracker

Local markdown under `docs/agents/issues/` (no git remote yet). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.

See `docs/agents/TOOLING.md` for installed skills and pinned versions.
