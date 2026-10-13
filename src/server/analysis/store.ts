import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gte, lt } from "drizzle-orm";
import { limits } from "@/config/limits";
import { regionOf } from "@/config/regions";
import type { Finding, PriceOpinion, VerdictResult } from "@/lib/analysis/result";
import { anonymizeText } from "@/lib/anonymize";
import type { Extraction } from "@/lib/extraction/schema";
import type { LlmUsage } from "@/lib/llm-cost";
import type { Database } from "@/server/db/client";
import { analyses, priceLines } from "@/server/db/schema";
import { windowStart } from "@/server/pricing/comparables";
import { priceableLines } from "@/server/pricing/price-quote";

/**
 * Enregistrement d'une analyse. Jamais le devis : seulement ce que Loupe en
 * a conclu (constats, avis de prix, verdict), la catégorie, le département et
 * les lignes anonymisées. L'extraction ne contient de toute façon aucune
 * valeur personnelle : l'émetteur n'y est décrit que par des booléens, et les
 * libellés sont passés au filtre d'anonymisation.
 */

/** L'extraction sans ses lignes, qui vont dans `price_lines`. */
export type StoredQuote = Omit<Extraction, "lines">;

/** Contenu de `analyses.result`. */
export interface StoredResult {
  readonly version: 1;
  readonly quote: StoredQuote;
  readonly findings: readonly Finding[];
  readonly prices: readonly PriceOpinion[];
  readonly pricesComplete: boolean;
  readonly verdict: VerdictResult;
}

/**
 * Empreinte des prix d'un devis : la même pour un devis analysé deux fois
 * (catégorie, département, date, prestations, quantités et montants), pour
 * qu'il ne compte qu'une fois dans les médianes. Les libellés n'y entrent pas :
 * deux lectures d'une même photo ne les recopient pas toujours à l'identique.
 */
export function quoteFingerprint(extraction: Extraction): string {
  const material = JSON.stringify([
    extraction.category,
    extraction.meta.department ?? null,
    extraction.meta.quoteDate ?? null,
    extraction.lines.map((line) => [
      line.canonicalItem ?? null,
      line.quantity ?? null,
      line.unitPriceHT ?? null,
      line.totalHT ?? null,
    ]),
    extraction.totals.totalTTC ?? null,
  ]);
  return createHash("sha256").update(material).digest("base64url");
}

/** Identifiant d'une analyse : 128 bits aléatoires, impossible à deviner. */
export function newAnalysisId(): string {
  return randomBytes(16).toString("base64url");
}

export interface SaveAnalysisInput {
  readonly extraction: Extraction;
  readonly fingerprint: string;
  readonly findings: readonly Finding[];
  readonly prices: readonly PriceOpinion[];
  readonly pricesComplete: boolean;
  readonly verdict: VerdictResult;
  readonly usage: LlmUsage;
  readonly costUsd: number | null;
  readonly now?: Date;
}

export interface SavedAnalysis {
  readonly id: string;
  readonly expiresAt: Date;
  /** Faux si le même devis a déjà été compté : ses lignes n'entrent pas une seconde fois dans les médianes. */
  readonly counted: boolean;
}

export async function saveAnalysis(db: Database, input: SaveAnalysisInput): Promise<SavedAnalysis> {
  const { extraction, fingerprint } = input;
  const now = input.now ?? new Date();
  const id = newAnalysisId();
  const expiresAt = new Date(now.getTime() + limits.analysisRetentionDays * 24 * 60 * 60 * 1000);
  const department = extraction.meta.department ?? null;
  const region = regionOf(extraction.meta.department) ?? null;
  const { lines, ...quote } = extraction;
  const result: StoredResult = {
    version: 1,
    quote: { ...quote, subject: anonymizeText(quote.subject) },
    findings: input.findings,
    prices: input.prices,
    pricesComplete: input.pricesComplete,
    verdict: input.verdict,
  };

  return db.transaction(async (tx) => {
    const already = await tx
      .select({ id: priceLines.id })
      .from(priceLines)
      .where(
        and(
          eq(priceLines.fingerprint, fingerprint),
          eq(priceLines.comparable, true),
          gte(priceLines.createdAt, windowStart(now)),
        ),
      )
      .limit(1);
    const counted = already.length === 0;
    const priceable = new Map(priceableLines(extraction).map((entry) => [entry.index, entry.price]));

    await tx.insert(analyses).values({
      id,
      createdAt: now,
      expiresAt,
      category: extraction.category,
      department,
      region,
      verdict: input.verdict.verdict,
      result,
      fingerprint,
      llmCostUsd: input.costUsd,
      llmInputTokens: input.usage.inputTokens + input.usage.cacheWriteTokens + input.usage.cacheReadTokens,
      llmOutputTokens: input.usage.outputTokens,
    });

    if (lines.length > 0) {
      await tx.insert(priceLines).values(
        lines.map((line, position) => {
          const price = priceable.get(position);
          const comparable = counted && region !== null && line.canonicalItem !== undefined && price !== undefined;
          return {
            analysisId: id,
            position,
            createdAt: now,
            category: extraction.category,
            department,
            region,
            label: anonymizeText(line.label),
            canonicalItem: line.canonicalItem ?? null,
            quantity: line.quantity ?? null,
            unit: line.unit ?? null,
            unitPriceHT: line.unitPriceHT ?? null,
            totalHT: line.totalHT ?? null,
            vatRate: line.vatRate ?? null,
            confidence: line.confidence,
            comparable,
            comparableUnit: comparable ? (price?.unit ?? null) : null,
            comparablePrice: comparable ? (price?.unitPrice ?? null) : null,
            fingerprint,
          };
        }),
      );
    }
    return { id, expiresAt, counted };
  });
}

/**
 * Efface les analyses expirées (30 jours) et les lignes sorties de la
 * fenêtre de comparaison (24 mois). Les lignes d'une analyse effacée restent,
 * détachées, tant qu'elles servent aux médianes.
 */
export async function purgeExpiredAnalyses(db: Database, now = new Date()): Promise<void> {
  await db.delete(analyses).where(lt(analyses.expiresAt, now));
  await db.delete(priceLines).where(lt(priceLines.createdAt, windowStart(now)));
}
