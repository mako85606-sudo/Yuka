/**
 * Applique les migrations SQL (`drizzle/`) à la base de `DATABASE_URL`, avant
 * le build de déploiement (`npm run vercel-build`, que Vercel lance à la place
 * de `build`). Sans `DATABASE_URL`, rien à faire : le script s'arrête sans
 * erreur, et le build continue.
 *
 *   npm run db:deploy
 */
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { postgresConnection } from "../src/server/db/connection";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.info("[migrations] DATABASE_URL n'est pas définie : rien à appliquer.");
    return;
  }
  // Une seule connexion, et pas de requêtes préparées (compatibles avec les poolers de Neon et Supabase).
  // Chiffrée vers une base distante, adresse nettoyée, comme le site (`postgresConnection`).
  const connection = postgresConnection(url);
  const client = postgres(connection.url, { max: 1, prepare: false, connect_timeout: 15, ssl: connection.ssl });
  try {
    await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
    console.info("[migrations] base à jour.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("[migrations] échec :", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
