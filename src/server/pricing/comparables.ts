import "server-only";
import { and, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { pricingConfig } from "@/config/pricing";
import type { RegionCode } from "@/config/regions";
import type { QuoteUnit, TaxonomyId } from "@/config/taxonomy";
import type { Database } from "@/server/db/client";
import { priceLines } from "@/server/db/schema";
import { parisDay } from "@/server/rate-limit";

/**
 * Prix comparables de la base Loupe : lignes anonymisées des devis déjà
 * analysés, même prestation, même unité de comparaison, même région, saisies
 * il y a moins de `windowMonths` mois. Un devis ne se compare jamais à
 * lui-même (empreinte différente).
 *
 * Contre l'empoisonnement de la base (quelques faux devis aux prix absurdes
 * envoyés d'un coup) : au plus `maxComparablesPerDay` lignes par jour
 * d'enregistrement, et des lignes venues d'au moins `minComparableDays` jours
 * différents. Sinon, pas de médiane : l'avis passe par l'estimation IA, qui
 * ne mène jamais à « À vérifier sérieusement ».
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

  // Le plafond par jour s'applique dans la requête, avant le plafond par
  // prestation : une avalanche de lignes le même jour ne peut pas évincer les
  // lignes des autres jours (ni celles des autres prestations).
  const day = sql`(${priceLines.createdAt} at time zone 'Europe/Paris')::date`;
  const ranked = db
    .select({
      item: priceLines.canonicalItem,
      unit: priceLines.comparableUnit,
      price: priceLines.comparablePrice,
      createdAt: priceLines.createdAt,
      dayRank: sql<number>`row_number() over (partition by ${priceLines.canonicalItem}, ${priceLines.comparableUnit}, ${day} order by ${priceLines.createdAt} desc)`.as(
        "day_rank",
      ),
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
    .as("ranked_by_day");
  const perItem = db
    .select({
      item: ranked.item,
      unit: ranked.unit,
      price: ranked.price,
      createdAt: ranked.createdAt,
      itemRank: sql<number>`row_number() over (partition by ${ranked.item}, ${ranked.unit} order by ${ranked.createdAt} desc)`.as(
        "item_rank",
      ),
    })
    .from(ranked)
    .where(lte(ranked.dayRank, pricingConfig.maxComparablesPerDay))
    .as("per_item");
  const rows = await db
    .select({ item: perItem.item, unit: perItem.unit, price: perItem.price, createdAt: perItem.createdAt })
    .from(perItem)
    .where(lte(perItem.itemRank, pricingConfig.maxComparablesPerItem))
    .orderBy(desc(perItem.createdAt));

  // Par clé : nombre de lignes retenues par jour d'enregistrement.
  const perDay = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (row.item === null || row.unit === null || row.price === null) continue;
    if (!Number.isFinite(row.price) || row.price <= 0) continue;
    const key = `${row.item}|${row.unit}`;
    if (!wanted.has(key)) continue;
    const prices = found.get(key) ?? [];
    if (prices.length >= pricingConfig.maxComparablesPerItem) continue;
    const days = perDay.get(key) ?? new Map<string, number>();
    const day = parisDay(row.createdAt);
    const sameDay = days.get(day) ?? 0;
    if (sameDay >= pricingConfig.maxComparablesPerDay) continue;
    days.set(day, sameDay + 1);
    perDay.set(key, days);
    prices.push(row.price);
    found.set(key, prices);
  }
  // Trop peu de jours différents : la base ne dit encore rien de fiable pour cette prestation.
  for (const [key, days] of perDay) {
    if (days.size < pricingConfig.minComparableDays) found.delete(key);
  }
  return found;
}
