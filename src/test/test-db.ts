import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Database } from "@/server/db/client";
import * as schema from "@/server/db/schema";

/**
 * Vraie base Postgres en mémoire (PGlite), migrée avec les migrations du
 * projet : les requêtes testées sont celles qui tourneront en production.
 */
export async function createTestDb(): Promise<{ db: Database; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return { db: db as unknown as Database, close: () => client.close() };
}
