import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // DB integration tests share one database, so run files serially.
    fileParallelism: false,
    // Integration tests talk to a (possibly remote) Postgres; each takes several seconds.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ["./scripts/load-env.ts"],
  },
});
