// Pas d'import « server-only » ni d'alias « @/ » ici : drizzle-kit charge ce
// fichier en dehors de Next.js pour générer les migrations.
import { date, index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Tables de Loupe. Le devis original n'y entre jamais ; une adresse IP non
 * plus (seulement un hachage salé, différent chaque jour).
 */

/** Compteur d'analyses par visiteur et par jour (heure de Paris). */
export const rateLimits = pgTable(
  "rate_limits",
  {
    /** HMAC du jour et de l'adresse IP : on ne peut pas remonter à l'IP, ni relier deux jours. */
    key: text("key").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.key, table.day] }),
    index("rate_limits_day_idx").on(table.day),
  ],
);

/** Inscriptions aux nouvelles de Loupe (landing, rapport détaillé). */
export const signups = pgTable("signups", {
  email: text("email").primaryKey(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
