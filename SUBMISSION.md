# Submission: Ajaia collaborative document editor

**Candidate:** Christoph Felix Kamgnomdjo Mojuye

| | |
| --- | --- |
| Live product | `ajaia-docs-sigma-ten.vercel.app` |
| Walkthrough video | see `VIDEO_URL.txt` |
| Test accounts | `alice@ajaia.dev`, `bob@ajaia.dev`, `carol@ajaia.dev`. Pick one on the login screen; no password. |

**Fastest review path:** sign in as Alice, open *Welcome to Ajaia Docs* and click **Share**. Then open the avatar menu, choose **Sign out**, and sign in as Bob (can edit) and Carol (view only).

## What's included

| Path | Contents |
| --- | --- |
| `src/`, `drizzle/`, `scripts/`, config files | Source code (Next.js + TipTap + Drizzle/Postgres) |
| `README.md` | Features, local setup and run instructions, tests, deployment steps |
| `ARCHITECTURE.md` | Architecture note: priorities, data model, access control, trade-offs, next steps |
| `AI_WORKFLOW.md` | AI workflow note |
| `SUBMISSION.md` | This file |
| `VIDEO_URL.txt` | Walkthrough video link |
| `tests/` | Vitest unit + Postgres integration tests (32) and the `.docx` fixture |
| `e2e/smoke.py` | Playwright end-to-end flow |
| `docs/screenshots/` | Screenshots of each main screen and state |
| `.github/workflows/ci.yml` | CI: typecheck, tests against Postgres, build |
| `docker-compose.yml` | Local Postgres for running the project |

## Status

**Working end to end:** create, rename, edit, autosave, reopen and delete documents. Rich text (bold, italic, underline, strike, H1–H3, bulleted and numbered lists, quote, undo/redo). Import of .txt, .md and .docx files as new documents. Sharing by email with editor or viewer roles, role changes, revocation and leaving a document. Separate "My documents" and "Shared with me" lists. Server-enforced permissions. Conflict detection for simultaneous edits. Postgres persistence.

**Intentionally not built:** real-time co-editing and cursors, real authentication, invites for non-users, attachments, export, comments and version history. The reasoning is in ARCHITECTURE.md.

**Next 2–4 hours:** live presence and remote-change notices, import into an existing doc, Markdown/.docx export with simple version history, and real auth.
