import "./load-env";
import { createDb } from "../src/db";
import { seed } from "../src/db/seed";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { db, pool } = createDb(url);
  await seed(db);
  await pool.end();
  console.log("Seeded demo users: alice@ajaia.dev, bob@ajaia.dev, carol@ajaia.dev");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
