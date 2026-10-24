import { pricingConfig } from "@/config/pricing";
import { taxonomyItem, type QuoteUnit } from "@/config/taxonomy";
import type { PriceOpinion } from "@/lib/analysis/result";
import type { ExtractedLine } from "@/lib/extraction/schema";
import { roundCents } from "@/lib/scene-quote";
import { median, quantile } from "./stats";

/**
 * Avis de prix ligne par ligne. Une ligne se compare dans l'unité de sa
 * prestation (heure, m², forfait…) : un prix unitaire au forfait ne se
 * compare jamais à un prix à l'heure.
 */

export interface ComparablePrice {
  readonly unit: QuoteUnit;
  /** Prix unitaire HT dans cette unité. */
  readonly unitPrice: number;
  readonly quantity: number;
}

/** Forfait, unité et lot se valent pour une prestation facturée une seule fois. */
const FLAT_UNITS = new Set<QuoteUnit>(["forfait", "unite", "lot"]);

function targetUnit(line: ExtractedLine): QuoteUnit | undefined {
  if (line.canonicalItem) return taxonomyItem(line.canonicalItem).unit;
  return line.unit;
}

/** Le prix de la ligne, prêt à être comparé ; `null` s'il n'est pas comparable. */
export function comparablePrice(line: ExtractedLine): ComparablePrice | null {
  if (line.canonicalItem === "divers.remise") return null;
  const unit = targetUnit(line) ?? (line.quantity === undefined || line.quantity === 1 ? "forfait" : undefined);
  if (!unit) return null;
  if (line.unit === unit && line.unitPriceHT !== undefined && line.unitPriceHT > 0) {
    return { unit, unitPrice: line.unitPriceHT, quantity: line.quantity ?? 1 };
  }
  const single = line.quantity === undefined || line.quantity === 1;
  const flat = FLAT_UNITS.has(unit) && (line.unit === undefined || FLAT_UNITS.has(line.unit));
  const price = line.unitPriceHT ?? line.totalHT;
  if (single && flat && price !== undefined && price > 0) return { unit, unitPrice: price, quantity: 1 };
  return null;
}

/** Montant de la ligne, pour choisir les lignes qui valent une estimation. */
export function lineWeight(price: ComparablePrice): number {
  return price.unitPrice * price.quantity;
}

/** Avis à partir de la base Loupe : médiane et quartiles des prix comparables. */
export function loupeOpinion(
  lineIndex: number,
  price: ComparablePrice,
  found: readonly number[],
): PriceOpinion | null {
  // Seuls des prix finis et positifs entrent dans une médiane.
  const comparables = found.filter((value) => Number.isFinite(value) && value > 0);
  if (comparables.length < pricingConfig.minComparables) return null;
  const middle = roundCents(median(comparables));
  return {
    lineIndex,
    source: { kind: "loupe", comparables: comparables.length },
    reference: {
      kind: "loupe",
      median: middle,
      p25: roundCents(quantile(comparables, 0.25)),
      p75: roundCents(quantile(comparables, 0.75)),
      comparables: comparables.length,
    },
    unit: price.unit,
    unitPrice: price.unitPrice,
    quantity: price.quantity,
    delta: roundCents((price.unitPrice - middle) * price.quantity),
  };
}

/**
 * Avis à partir d'une fourchette estimée par le modèle. L'écart ne se compte
 * qu'au-delà des bornes : à l'intérieur de la fourchette, rien à dire.
 */
export function aiOpinion(
  lineIndex: number,
  price: ComparablePrice,
  range: { readonly low: number; readonly high: number },
): PriceOpinion {
  const overHigh = price.unitPrice - range.high;
  const underLow = price.unitPrice - range.low;
  const perUnit = overHigh > 0 ? overHigh : underLow < 0 ? underLow : 0;
  return {
    lineIndex,
    source: { kind: "ai" },
    reference: { kind: "ai", low: roundCents(range.low), high: roundCents(range.high) },
    unit: price.unit,
    unitPrice: price.unitPrice,
    quantity: price.quantity,
    delta: roundCents(perUnit * price.quantity),
  };
}
