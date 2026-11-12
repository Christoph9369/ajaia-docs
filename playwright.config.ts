import { defineConfig } from "@playwright/test";

// BASE_URL points at a running production server (`npm run build && npm start`).
// Baselines must be generated in the official Playwright Docker image; see README.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3100", trace: "retain-on-failure" },
});
