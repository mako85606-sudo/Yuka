// Pas d'import « server-only » ni d'alias « @/ » ici : drizzle-kit charge ce
// fichier en dehors de Next.js pour générer les migrations.
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

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

/**
 * Dépense de l'API Claude par jour (heure de Paris), toutes analyses
 * comprises, réussies ou non. Au-delà du plafond (`limits.dailyLlmBudgetUsd`),
 * l'analyse s'arrête jusqu'au lendemain.
 */
export const llmSpend = pgTable("llm_spend", {
  day: date("day", { mode: "string" }).primaryKey(),
  usd: doublePrecision("usd").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Inscriptions aux nouvelles de Loupe (landing, rapport détaillé). */
export const signups = pgTable("signups", {
  email: text("email").primaryKey(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Une analyse : ce qui a été conclu, jamais le devis lui-même. Accessible
 * par son identifiant aléatoire jusqu'à `expires_at` (30 jours), puis effacée.
 * `result` contient l'objet du devis (anonymisé), ses dates, ses totaux, les
 * mentions présentes (booléens), les constats, les avis de prix et le verdict.
 */
export const analyses = pgTable(
  "analyses",
  {
    /** Aléatoire, impossible à deviner : c'est la seule clé d'accès. */
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    category: text("category").notNull(),
    department: text("department"),
    region: text("region"),
    verdict: text("verdict").notNull(),
    result: jsonb("result").notNull(),
    /** Empreinte des prix du devis : un même devis analysé deux fois ne compte qu'une fois. */
    fingerprint: text("fingerprint").notNull(),
    /**
     * Identifiant du lien de partage public (`/v/[shareId]`), créé à la demande.
     * Distinct de `id` : partager ne donne jamais accès à l'analyse privée.
     */
    shareId: text("share_id").unique(),
    llmCostUsd: doublePrecision("llm_cost_usd"),
    llmInputTokens: integer("llm_input_tokens").notNull().default(0),
    llmOutputTokens: integer("llm_output_tokens").notNull().default(0),
  },
  (table) => [
    index("analyses_expires_at_idx").on(table.expiresAt),
    index("analyses_created_at_idx").on(table.createdAt),
  ],
);

/**
 * Lignes anonymisées des devis analysés : elles redessinent la feuille d'une
 * analyse, et forment la base de comparaison des prix (24 mois). Quand
 * l'analyse expire, ses lignes restent, détachées (`analysis_id` à `null`).
 */
export const priceLines = pgTable(
  "price_lines",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    analysisId: text("analysis_id").references(() => analyses.id, { onDelete: "set null" }),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    category: text("category").notNull(),
    department: text("department"),
    region: text("region"),
    /** Libellé anonymisé. */
    label: text("label").notNull(),
    canonicalItem: text("canonical_item"),
    quantity: doublePrecision("quantity"),
    unit: text("unit"),
    unitPriceHT: doublePrecision("unit_price_ht"),
    totalHT: doublePrecision("total_ht"),
    vatRate: doublePrecision("vat_rate"),
    confidence: text("confidence").notNull(),
    /** Vrai si la ligne entre dans les médianes (prestation connue, prix sûr, devis pas déjà compté). */
    comparable: boolean("comparable").notNull().default(false),
    comparableUnit: text("comparable_unit"),
    comparablePrice: doublePrecision("comparable_price"),
    fingerprint: text("fingerprint").notNull(),
  },
  (table) => [
    index("price_lines_lookup_idx").on(table.canonicalItem, table.region, table.createdAt),
    index("price_lines_analysis_idx").on(table.analysisId),
    index("price_lines_fingerprint_idx").on(table.fingerprint),
    index("price_lines_created_at_idx").on(table.createdAt),
  ],
);

/**
 * Événements de mesure (entonnoir de `/admin`, et envoi à PostHog). Aucune
 * donnée personnelle : un nom d'événement de la liste fermée
 * (`src/lib/events.ts`), un identifiant aléatoire de visite (jamais stocké sur
 * l'appareil) et quelques propriétés validées.
 */
export const events = pgTable(
  "events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    visit: text("visit").notNull(),
    props: jsonb("props").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("events_name_created_at_idx").on(table.name, table.createdAt),
    index("events_created_at_idx").on(table.createdAt),
  ],
);
