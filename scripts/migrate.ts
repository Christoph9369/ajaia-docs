/**
 * Applies SQL migrations from ./drizzle. Runs on every deploy (see `vercel-build`).
 * Safe to re-run: already-applied migrations are skipped.
 */
import "./load-env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "../src/db";

async function main() {
  // Prefer a direct (non-pooled) connection for DDL when one is available (Neon's Vercel integration sets it).
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { db, pool } = createDb(url);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("Migrations applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
