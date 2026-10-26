/**
 * Applique les migrations SQL (`drizzle/`) avant le build de déploiement
 * (`npm run vercel-build`, que Vercel lance à la place de `build`), ou à la
 * main. La base visée suit `migrationTarget` (src/server/db/migration-target.ts) :
 * l'adresse directe de Neon d'abord, jamais depuis un déploiement de test
 * sans autorisation. Sans base, rien à faire : le script s'arrête sans
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
import { migrationTarget } from "../src/server/db/migration-target";

loadEnvConfig(process.cwd());

async function main() {
  const target = migrationTarget(process.env);
  if (target.kind === "skip") {
    console.info(`[migrations] ${target.reason}`);
    return;
  }
  // Une seule connexion, et pas de requêtes préparées (compatibles avec les poolers de Neon et Supabase).
  // Chiffrée vers une base distante, adresse nettoyée, comme le site (`postgresConnection`).
  const connection = postgresConnection(target.url);
  const client = postgres(connection.url, {
    max: 1,
    prepare: false,
    connect_timeout: 15,
    ssl: connection.ssl,
    // Les avis de Postgres (« schema "drizzle" already exists, skipping ») encombreraient le journal du build.
    onnotice: () => {},
  });
  try {
    await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
    console.info(`[migrations] base à jour (${target.source}).`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("[migrations] échec :", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
