import "server-only";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/server/db/schema";
import { serverEnv } from "@/server/env";

/** Base Drizzle, quel que soit le pilote (postgres.js en vrai, PGlite dans les tests). */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

// Un seul pool par processus, même quand Next.js recharge les modules en développement.
const holder = globalThis as typeof globalThis & {
  __loupeDb?: { readonly url: string; readonly db: Database };
};

/**
 * Connexion à Postgres (Neon ou Supabase), ou `null` si `DATABASE_URL`
 * n'est pas définie. `prepare: false` : les poolers en mode transaction
 * (Neon, Supavisor) ne gardent pas les requêtes préparées.
 */
export function getDb(): Database | null {
  const url = serverEnv().DATABASE_URL;
  if (!url) return null;
  if (holder.__loupeDb?.url !== url) {
    const client = postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 });
    holder.__loupeDb = { url, db: drizzle(client, { schema }) };
  }
  return holder.__loupeDb.db;
}
