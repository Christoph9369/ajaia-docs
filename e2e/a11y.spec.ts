import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES, ROUTES, THEMES, resolveRoute, signIn } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * Violations that exist in today's approved design and are tracked in docs/design/AUDIT-2026-11.md.
 * Scoped to one route and one rule so any NEW violation still fails. Delete an entry when its fix lands.
 */
const KNOWN_ISSUES: Record<string, Record<string, string>> = {
  "/login": { "color-contrast": "audit #1: white text on #059669 / #d97706 avatars" },
  "/documents": { label: "audit #9: file input #import-file has no accessible label" },
};

for (const theme of THEMES) {
  test.describe(`axe, ${theme} scheme`, () => {
    test.use({ colorScheme: theme });
    for (const route of ROUTES) {
      test(`${route} has no new WCAG 2.2 AA violations`, async ({ page, context, baseURL }) => {
        if (!PUBLIC_ROUTES.includes(route)) await signIn(context, baseURL!);
        await page.goto(await resolveRoute(context, baseURL!, route));
        await page.waitForLoadState("networkidle");
        const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        const known = KNOWN_ISSUES[route] ?? {};
        for (const id of Object.keys(known)) {
          if (violations.some((v) => v.id === id)) test.info().annotations.push({ type: "known-issue", description: `${id}: ${known[id]}` });
        }
        const fresh = violations.filter((v) => !(v.id in known));
        expect(fresh.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
      });
    }
  });
}
