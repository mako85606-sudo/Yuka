import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Mêmes fichiers .env que Next.js (.env.local en tête).
loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
  ...(url ? { dbCredentials: { url } } : {}),
});
