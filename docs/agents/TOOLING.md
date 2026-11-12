# AI tooling (project scope)

Installed 2026-11-12 with `npx skills@latest add ... -a claude-code --copy` into `.claude/skills/`. `skills-lock.json` holds the content hashes; restore with `npx skills experimental_install`.

## Pinned sources (commit at install time)

| Source | Commit | Skills |
|---|---|---|
| mattpocock/skills | `5863806dd4e15c63174bee4e7515a4256792ecfa` | setup-matt-pocock-skills, git-guardrails-claude-code, tdd, grill-me, grilling |
| pbakaus/impeccable (v4.8.2) | `b4bff1626c344067788c2679f048a20057c7cc5a` | impeccable |
| emilkowalski/skills | `4061b67b8d976a186aca118594f54b638c5f718a` | emil-design-eng, review-animations, improve-animations |

Content hashes: see `skills-lock.json`.

## Notes
- `grilling` was added because `grill-me` only calls it; without it `grill-me` does nothing.
- Not installed: `to-prd`, `to-issues`/`prd-to-issues`, `triage-issue` (not in the repo under those names; closest are `to-spec`, `to-tickets`, `triage`). Awaiting decision.
- `impeccable` launcher downloads a platform binary on first run, verified against `engine-checksums.txt`. Its plugin hooks (SessionStart/PostToolUse/Stop) were not installed by the skills CLI.
- Git guardrail hook: `.claude/hooks/block-dangerous-git.sh`, wired in `.claude/settings.json`. Blocks any Bash command whose text matches: `git push`, `git reset --hard`, `git clean -f` (incl. `-fd`), `git branch -D`, `git checkout .`, `git restore .`, `push --force`, `reset --hard`. It matches the whole command string, so even a heredoc that merely contains those words is blocked. Needs `jq`.
- Issue tracker: local markdown in `docs/agents/issues/` (no git remote). Triage labels not configured because `triage` is not installed.
