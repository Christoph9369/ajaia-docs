import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES, ROUTES, VIEWPORTS, resolveRoute, signIn, volatileMasks } from "./helpers";

test.use({ colorScheme: "light", reducedMotion: "reduce" });

for (const vp of VIEWPORTS) {
  test.describe(`visual ${vp.name} ${vp.width}px`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    for (const route of ROUTES) {
      test(`${route}`, async ({ page, context, baseURL }) => {
        if (!PUBLIC_ROUTES.includes(route)) await signIn(context, baseURL!);
        await page.goto(await resolveRoute(context, baseURL!, route));
        await page.waitForLoadState("networkidle");
        const name = `${route.replace(/\[[^\]]+\]/, "id").replace(/\//g, "_").replace(/^_/, "") || "root"}-${vp.name}.png`;
        await expect(page).toHaveScreenshot(name, { fullPage: true, mask: volatileMasks(page) });
      });
    }
  });
}
