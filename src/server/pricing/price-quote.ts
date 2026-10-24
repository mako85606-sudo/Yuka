import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { pricingConfig } from "@/config/pricing";
import { REGIONS, regionOf } from "@/config/regions";
import type { PriceOpinion } from "@/lib/analysis/result";
import { isVagueLine } from "@/lib/checks/vague-lines";
import type { Extraction } from "@/lib/extraction/schema";
import { EMPTY_USAGE, type LlmUsage } from "@/lib/llm-cost";
import { aiOpinion, comparablePrice, lineWeight, loupeOpinion, type ComparablePrice } from "@/lib/pricing/opinions";
import type { Database } from "@/server/db/client";
import { comparableKey, findComparables, type ComparableKey } from "@/server/pricing/comparables";
import { estimatePrices } from "@/server/pricing/estimate-prices";
import { errorSummary } from "@/server/log";

/**
 * Les avis de prix d'un devis. D'abord la base Loupe (médiane de devis
 * comparables, dès `minComparables`) ; pour les lignes restantes, une
 * fourchette demandée au modèle, étiquetée « estimation IA, confiance
 * faible ». Une ligne mal lue, vague ou trop petite reste sans avis : mieux
 * vaut rien qu'un avis sur un prix incertain.
 */

/** En dessous, il ne reste pas assez de temps pour une estimation utile. */
const MIN_ESTIMATE_TIMEOUT_MS = 5_000;

export interface PriceQuoteOptions {
  readonly extraction: Extraction;
  /** Empreinte du devis (`quoteFingerprint`), pour l'écarter de ses propres comparables. */
  readonly fingerprint: string;
  readonly db: Database | null;
  readonly client: Anthropic;
  readonly model: string;
  readonly signal?: AbortSignal;
  /** Temps accordé à l'estimation IA (le reste du budget de la requête). */
  readonly estimateTimeoutMs?: number;
  readonly now?: Date;
}

export interface PriceQuoteOutcome {
  /** Un avis par ligne comparée, dans l'ordre du devis. */
  readonly opinions: readonly PriceOpinion[];
  /** Faux si une source a manqué (base indisponible, estimation échouée) : des lignes restent sans avis. */
  readonly complete: boolean;
  readonly usage: LlmUsage;
  readonly costUsd: number | null;
}

interface PricedLine {
  readonly index: number;
  readonly price: ComparablePrice;
}

/** Lignes dont le prix peut recevoir un avis. */
export function priceableLines(extraction: Extraction): PricedLine[] {
  const priced: PricedLine[] = [];
  extraction.lines.forEach((line, index) => {
    if (line.confidence === "low" || isVagueLine(line)) return;
    const price = comparablePrice(line);
    if (price) priced.push({ index, price });
  });
  return priced;
}

export async function priceQuote(options: PriceQuoteOptions): Promise<PriceQuoteOutcome> {
  const { extraction } = options;
  const now = options.now ?? new Date();
  const region = regionOf(extraction.meta.department);
  const lines = priceableLines(extraction);
  const opinions = new Map<number, PriceOpinion>();
  let complete = true;

  // 1. Base Loupe.
  const keyed = lines.flatMap((entry) => {
    const item = extraction.lines[entry.index]?.canonicalItem;
    return item ? [{ ...entry, key: { item, unit: entry.price.unit } satisfies ComparableKey }] : [];
  });
  if (options.db && region && keyed.length > 0) {
    try {
      const comparables = await findComparables(options.db, {
        region,
        keys: keyed.map((entry) => entry.key),
        fingerprint: options.fingerprint,
        now,
      });
      for (const entry of keyed) {
        const opinion = loupeOpinion(entry.index, entry.price, comparables.get(comparableKey(entry.key)) ?? []);
        if (opinion) opinions.set(entry.index, opinion);
      }
    } catch (error) {
      console.error(`[prix] base de comparaison indisponible : ${errorSummary(error)}`);
      complete = false;
    }
  }

  // 2. Estimation IA pour les lignes restantes, les plus chères d'abord.
  const toEstimate = lines
    .filter((entry) => !opinions.has(entry.index) && lineWeight(entry.price) >= pricingConfig.minEstimatedAmount)
    .sort((a, b) => lineWeight(b.price) - lineWeight(a.price))
    .slice(0, pricingConfig.maxEstimatedLines)
    .sort((a, b) => a.index - b.index);

  let usage = EMPTY_USAGE;
  let costUsd: number | null = 0;
  const timeoutMs = Math.min(options.estimateTimeoutMs ?? pricingConfig.estimateTimeoutMs, pricingConfig.estimateTimeoutMs);
  if (toEstimate.length > 0 && timeoutMs < MIN_ESTIMATE_TIMEOUT_MS) {
    complete = false;
  } else if (toEstimate.length > 0) {
    const estimate = await estimatePrices({
      client: options.client,
      model: options.model,
      category: extraction.category,
      regionName: region ? REGIONS[region] : undefined,
      lines: toEstimate.map((entry) => ({
        index: entry.index,
        label: extraction.lines[entry.index]?.label ?? "",
        unit: entry.price.unit,
        quantity: entry.price.quantity,
      })),
      signal: options.signal,
      timeoutMs,
      now,
    });
    usage = estimate.usage;
    costUsd = estimate.costUsd;
    if (!estimate.ok) complete = false;
    for (const entry of toEstimate) {
      const range = estimate.ranges.get(entry.index);
      if (range) opinions.set(entry.index, aiOpinion(entry.index, entry.price, range));
    }
  }

  return {
    opinions: [...opinions.values()].sort((a, b) => a.lineIndex - b.lineIndex),
    complete,
    usage,
    costUsd,
  };
}
