// Load .env for CLI scripts (Next.js loads it automatically for the app; Vercel injects env vars).
import { existsSync } from "node:fs";

if (existsSync(".env") && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env");
}
