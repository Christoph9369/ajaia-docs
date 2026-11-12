# Product context (AJAIA_DOCS)

Source: README.md, ARCHITECTURE.md, CLAUDE.md, src/app/globals.css. Nothing here is invented; edit freely.

## What it is
Ajaia Docs: a lightweight collaborative document editor (take-home project). Create and format documents in the browser, import .txt/.md/.docx, share with teammates as editor or viewer. Single language (English). No separate marketing site: surfaces are login (demo account picker), dashboard (My documents / Shared with me), and the editor.

## Mode
Operate. Daily-use tool: predictable layouts, scanability, minimal motion. Trust matters most: visible save state, clear conflict handling, clear role badges.

## Current design tokens (from globals.css, Tailwind v4 @theme)
- ink #1f2328, muted #656d76, line #e3e6ea, canvas #f4f5f7, accent #2f5bea, accent-soft #e8eefe
- Fonts: Inter (UI), Source Serif 4 (document body). Headings in the editor use the sans.
- Styling stack: Tailwind CSS 4. Keep it. No animation library.

## Rules for design work
- Work within the existing tokens and stack. Propose changes as findings; do not introduce new fonts, libraries or a new visual direction without approval.
- No page, component, style or API changes unless an approved task says so.
