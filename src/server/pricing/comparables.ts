import "server-only";
import { and, desc, eq, gte, inArray, ne } from "drizzle-orm";
import { pricingConfig } from "@/config/pricing";
import type { RegionCode } from "@/config/regions";
import type { QuoteUnit, TaxonomyId } from "@/config/taxonomy";
import type { Database } from "@/server/db/client";
import { priceLines } from "@/server/db/schema";

/**
 * Prix comparables de la base Loupe : lignes anonymisées des devis déjà
 * analysés, même prestation, même unité de comparaison, même région, saisies
 * il y a moins de `windowMonths` mois. Un devis ne se compare jamais à
 * lui-même (empreinte différente).
 */

export interface ComparableKey {
  readonly item: TaxonomyId;
  readonly unit: QuoteUnit;
}

export function comparableKey(key: ComparableKey): string {
  return `${key.item}|${key.unit}`;
}

/** Début de la fenêtre de comparaison. */
export function windowStart(now: Date): Date {
  const start = new Date(now);
  start.setUTCMonth(start.getUTCMonth() - pricingConfig.windowMonths);
  return start;
}

export interface ComparablesQuery {
  readonly region: RegionCode;
  readonly keys: readonly ComparableKey[];
  /** Empreinte du devis analysé, pour ne pas le compter parmi ses propres comparables. */
  readonly fingerprint: string;
  readonly now: Date;
}

/** Prix unitaires HT comparables, par clé (`comparableKey`), les plus récents d'abord. */
export async function findComparables(db: Database, query: ComparablesQuery): Promise<Map<string, number[]>> {
  const found = new Map<string, number[]>();
  const items = [...new Set(query.keys.map((key) => key.item))];
  if (items.length === 0) return found;
  const wanted = new Set(query.keys.map(comparableKey));

  const rows = await db
    .select({
      item: priceLines.canonicalItem,
      unit: priceLines.comparableUnit,
      price: priceLines.comparablePrice,
    })
    .from(priceLines)
    .where(
      and(
        eq(priceLines.comparable, true),
        eq(priceLines.region, query.region),
        inArray(priceLines.canonicalItem, items),
        gte(priceLines.createdAt, windowStart(query.now)),
        ne(priceLines.fingerprint, query.fingerprint),
      ),
    )
    .orderBy(desc(priceLines.createdAt))
    .limit(pricingConfig.maxComparablesPerItem * items.length);

  for (const row of rows) {
    if (row.item === null || row.unit === null || row.price === null) continue;
    const key = `${row.item}|${row.unit}`;
    if (!wanted.has(key)) continue;
    const prices = found.get(key) ?? [];
    if (prices.length < pricingConfig.maxComparablesPerItem) prices.push(row.price);
    found.set(key, prices);
  }
  return found;
}
