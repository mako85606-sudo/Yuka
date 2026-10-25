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
 * Chiffrement de la connexion : exigé partout, sauf vers une base locale
 * (développement), qui n'a en général pas de certificat.
 */
export function sslFor(url: string): "require" | false {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]" ? false : "require";
  } catch {
    return "require";
  }
}

/**
 * Connexion à Postgres (Neon ou Supabase), ou `null` si `DATABASE_URL`
 * n'est pas définie. `prepare: false` : les poolers en mode transaction
 * (Neon, Supavisor) ne gardent pas les requêtes préparées. Connexion chiffrée
 * vers toute base distante (`sslFor`).
 */
export function getDb(): Database | null {
  const url = serverEnv().DATABASE_URL;
  if (!url) return null;
  if (holder.__loupeDb?.url !== url) {
    const client = postgres(url, {
      prepare: false,
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: sslFor(url),
    });
    holder.__loupeDb = { url, db: drizzle(client, { schema }) };
  }
  return holder.__loupeDb.db;
}
