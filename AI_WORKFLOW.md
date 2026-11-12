# AI workflow note

## Tools I used

- **Claude Code (Claude Sonnet 5.5) in my terminal, working inside this repo.** It reads and edits files and runs commands (tests, builds, `curl`, a headless browser), so it can check its own work instead of only suggesting code.
- **My own checks:** running the app and the test suite myself, reading the screenshots and failures, the browser DevTools console, and the Vercel and Neon dashboards.
- **Project guard rails I set up with it:** `CLAUDE.md` (project rules plus the Karpathy guidelines), a hook that blocks destructive git commands, and Playwright, axe and the Impeccable detector for visual and accessibility checks.

## Where AI sped things up

- **Scaffolding.** Project config, the Drizzle schema and migration, route handlers, Zod schemas and the Tailwind UI shell.
- **Tests.** A permission matrix, import edge cases (empty, oversized, corrupt .docx, XSS payloads), Postgres integration scenarios, and a real `.docx` fixture.
- **Verification loops.** A `curl` sweep of the status codes (401/403/404/409/415/400) and a Playwright script (`e2e/smoke.py`) that drives the full flow across three users and produced `docs/screenshots/`.
- **Later:** a design audit with real screenshots, a Playwright + axe suite for accessibility and visual regressions, and the header and typography refresh.
- **Docs.** First drafts of the README and architecture note, which I edited.

## What I reviewed

I did not take the output on trust; I ran it.

- **Setup.** I ran `npm install` myself and saw the Node engine warnings. I ran `db:setup` and `npm test` on my machine.
- **A test failure.** One integration test failed with a 5-second timeout. I looked at it and it was latency to my remote Neon database, not a logic bug (31 of 32 passed). I accepted a 30-second timeout rather than weakening the test.
- **A brief that didn't fit.** A tooling brief written for another project (a French agency site with different routes and a pnpm monorepo) did not match this repo. Claude flagged the mismatch and I told it how to adapt it rather than letting it install things blindly.
- **The design.** I looked at light and dark screenshots at desktop and phone widths. That showed there is no dark theme and the mobile editor header was cramped, so I approved a header and typography refresh and ruled out dark mode.
- **Production.** After deploying to Vercel I read the runtime logs myself and reported the exact error.

## What I changed or rejected

- **Prisma → Drizzle.** The first plan used Prisma, whose install downloads native binaries, and that failed in the build environment. I switched to Drizzle (pure TypeScript, no binary step, easier for reviewers to run).
- **Versions.** I use Next 16 and Zod 4, and pinned TypeScript 5.
- **Storage format.** I chose sanitized HTML over ProseMirror JSON: one format across import, editor and database, with server-side sanitization. The reasoning is in `ARCHITECTURE.md`.
- **Autosave.** I rejected a plain debounced `PATCH`, which silently loses a collaborator's edits. Saves use a version check; a stale save returns 409 and the user chooses between loading the other version or keeping theirs.
- **Delete confirmation.** An inline confirm button replaced the native `confirm()`.
- **An accessibility bug found by testing.** Dashboard sections used `aria-labelledby` IDs containing spaces, which assistive tech reads as several IDs. A browser test could not find the region by name, and slugged IDs fixed it.
- **Error copy.** I rewrote generated messages to be specific, e.g. *"“.png” files aren't supported. Upload a .txt, .md or .docx file."*
- **No Docker for testing.** The project is hosted on Vercel with Neon, so I rejected a local-Docker workflow. Visual tests run in a pinned Playwright container on GitHub's runners only.
- **No dark mode.** The audit offered it; I decided against it.
- **UI fixes from the audit:** one shared header with an avatar menu and **Sign out**, a separate document bar in the editor, Inter and Source Serif 4 actually loaded, avatar colours darkened to meet 4.5:1 contrast, a label on the hidden import input, and document previews that no longer repeat the title.
- **Not everything was installed.** Three skills named in a brief do not exist under those names (`to-prd`, `to-issues`, `triage-issue`). I did not substitute others; that is still open.

## What I would do differently

- **Treat engine warnings as errors.** `npm install` warned that `sanitize-html` and `vitest` need Node 22.12, while `package.json` said `>=20`. The first Vercel deploy then crashed `/login`. I should have pinned Node 22 on day one.
- **Test the production build on a stricter runtime.** I listed `sanitize-html` in `serverExternalPackages`, which makes Next load it from `node_modules` at runtime. It then required an ES-only dependency and failed on Vercel. Bundling it fixed the crash. Locally it worked because my Node supported more than Vercel's did. I only reproduced it afterwards with `--no-experimental-require-module`.
- **Deploy early.** I built tests, audits and CI before the first deploy, and the deploy was where the real problem appeared.
- **Use a separate test database.** Integration tests ran against a remote database, which made them slow and caused the timeout above.
- **Decide the CI plan before generating screenshots.** I first made the visual baselines in a local Docker container, then dropped Docker. The baselines are stale after the header redesign and need regenerating through the GitHub workflow.
- **Keep tooling proportional.** This is a three-page app, and a heavy audit setup was more than it needed.

## How I verified correctness, UX and reliability

1. **Automated tests:** 35 Vitest tests, including integration tests against real Postgres (not mocks) for every sharing and permission rule and the conflict path.
2. **Type safety:** `tsc --noEmit` and a production `next build`.
3. **API contract sweep:** `curl` checks of each status code against the production build.
4. **Browser flow:** `e2e/smoke.py` covers create, format, reload, share, import, conflict and viewer. **I have not re-run it since the header change.**
5. **Accessibility:** an axe check (WCAG 2.2 AA) on every route, with zero violations.
6. **Visual review:** I read the screenshots for layout, hierarchy and state clarity. The visual regression baselines are stale until regenerated, and CI has not run yet because of a billing lock on my GitHub account.
7. **Production check:** the crash above was found and reproduced locally before I fixed it. I have not yet confirmed `/login` works on the redeployed Vercel build.
