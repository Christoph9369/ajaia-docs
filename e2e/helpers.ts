import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import type { BrowserContext, Page } from "@playwright/test";

/** Routes come from the App Router file tree (every page.tsx under src/app), so there is no second list to maintain. */
export function discoverRoutes(dir = path.join(process.cwd(), "src/app"), prefix = ""): string[] {
  const routes: string[] = [];
  if (existsSync(path.join(dir, "page.tsx"))) routes.push(prefix || "/");
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "api") continue;
    const seg = /^\(.*\)$/.test(e.name) ? "" : `/${e.name}`;
    routes.push(...discoverRoutes(path.join(dir, e.name), prefix + seg));
  }
  return routes;
}

export const PUBLIC_ROUTES = ["/login"];
export const ROUTES = discoverRoutes().filter((r) => r !== "/"); // "/" only redirects

export const THEMES = ["light", "dark"] as const;
export const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
] as const;

/** Sign in through the real API and hand the session cookie to the browser context. */
export async function signIn(context: BrowserContext, baseURL: string, email = "alice@ajaia.dev") {
  const res = await context.request.post(`${baseURL}/api/auth/login`, { data: { email } });
  if (!res.ok()) throw new Error(`login failed: ${res.status()}`);
  const raw = res.headers()["set-cookie"] ?? "";
  const [pair] = raw.split(";");
  const eq = pair.indexOf("=");
  // Production cookies are Secure; strip that so the same cookie works over plain http in Docker/CI.
  await context.clearCookies();
  await context.addCookies([{ name: pair.slice(0, eq), value: pair.slice(eq + 1), url: baseURL, httpOnly: true, secure: false }]);
}

/** Replace dynamic segments with a real seeded id (Alice's first owned document). */
export async function resolveRoute(context: BrowserContext, baseURL: string, route: string) {
  if (!route.includes("[")) return route;
  const res = await context.request.get(`${baseURL}/api/documents`);
  const { owned } = (await res.json()) as { owned: Array<{ id: string; title: string }> };
  const doc = owned.find((d) => d.title.startsWith("Welcome")) ?? owned[0];
  return route.replace(/\[[^\]]+\]/, doc.id);
}

/** Mask anything that changes between runs (relative timestamps such as "Edited 2 minutes ago"). */
export function volatileMasks(page: Page) {
  return [page.getByText(/^Edited /), page.getByText(/^(Saved|Saving|Unsaved)/)];
}
