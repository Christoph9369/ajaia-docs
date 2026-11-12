import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

export function createDb(connectionString: string): { db: DB; pool: Pool } {
  // SSL is driven by the connection string (Neon URLs include sslmode=require).
  const pool = new Pool({ connectionString, max: 5 });
  return { db: drizzle(pool, { schema }), pool };
}

// Reuse one pool across hot reloads in dev and across invocations of a warm serverless function.
const globalForDb = globalThis as unknown as { __db?: DB };

export function getDb(): DB {
  if (!globalForDb.__db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
    globalForDb.__db = createDb(url).db;
  }
  return globalForDb.__db;
}

export { schema };
