# AI tooling (project scope)

Installed 2026-11-12 with `npx skills@latest add ... -a claude-code --copy` into `.claude/skills/`. `skills-lock.json` holds the content hashes; restore with `npx skills experimental_install`.

## Pinned sources (commit at install time)

| Source | Commit | Skills |
|---|---|---|
| mattpocock/skills | `5863806dd4e15c63174bee4e7515a4256792ecfa` | setup-matt-pocock-skills, git-guardrails-claude-code, tdd, grill-me, grilling |
| pbakaus/impeccable (v4.8.2) | `b4bff1626c344067788c2679f048a20057c7cc5a` | impeccable |
| emilkowalski/skills | `4061b67b8d976a186aca118594f54b638c5f718a` | emil-design-eng, review-animations, improve-animations |

Content hashes: see `skills-lock.json`.

## Phase 2: visual checks (exact versions, devDependencies)

| Package | Version | Use |
|---|---|---|
| @playwright/test | 1.65.0 | e2e a11y and visual specs |
| @axe-core/playwright | 4.14.0 | WCAG 2.2 AA checks |
| @playwright/cli | 0.1.24 | `playwright-cli`, Claude's browser; skill in `.claude/skills/playwright-cli` |
| designlang (npx, not installed) | 13.4.1 | one-off drift check of our own site; never `apply`, never `--smart` |
| Docker image | `mcr.microsoft.com/playwright:v1.65.0-noble` | baselines and the CI `e2e` job; must match @playwright/test |

Playwright skill permissions narrowed: `allowed-tools: Bash(playwright-cli:*)` only (removed `Bash(npx playwright:*)` and `Bash(npx --no-install playwright:*)`). Not installed: React Bits, GSAP or any animation library.

## Notes
- `grilling` was added because `grill-me` only calls it; without it `grill-me` does nothing.
- Not installed: `to-prd`, `to-issues`/`prd-to-issues`, `triage-issue` (not in the repo under those names; closest are `to-spec`, `to-tickets`, `triage`). Awaiting decision.
- `impeccable` launcher downloads a platform binary on first run, verified against `engine-checksums.txt`. Its plugin hooks (SessionStart/PostToolUse/Stop) were not installed by the skills CLI.
- Git guardrail hook: `.claude/hooks/block-dangerous-git.sh`, wired in `.claude/settings.json`. Blocks any Bash command whose text matches: `git push`, `git reset --hard`, `git clean -f` (incl. `-fd`), `git branch -D`, `git checkout .`, `git restore .`, `push --force`, `reset --hard`. It matches the whole command string, so even a heredoc that merely contains those words is blocked. Needs `jq`.
- Issue tracker: local markdown in `docs/agents/issues/` (no git remote). Triage labels not configured because `triage` is not installed.
