import type { PriceSource } from "@/lib/price-wording";

/**
 * Ce que la scène de correction affiche : un devis reconstruit (jamais de nom,
 * d'adresse ni de numéro), ses problèmes vérifiés, ses avis de prix et le
 * verdict. Les démos le remplissent avec des données fictives ; l'écran de
 * résultat le remplira à partir de l'analyse réelle.
 */

export type Verdict = "ok" | "negotiate" | "alert";

/** Libellés des verdicts, tels qu'imprimés sur le tampon. */
export const VERDICT_LABELS: Record<Verdict, string> = {
  ok: "Correct",
  negotiate: "À négocier",
  alert: "À vérifier sérieusement",
};

export interface SceneLine {
  readonly id: string;
  readonly label: string;
  readonly quantity: number;
  readonly unit: string;
  readonly unitPriceHT: number;
  /** Total HT tel qu'écrit sur le devis (peut être faux : c'est ce qu'on vérifie). */
  readonly totalHT: number;
}

export type IssueKind = "calculation" | "vague-line";

export interface SceneIssue {
  readonly id: string;
  readonly kind: IssueKind;
  readonly lineId: string;
  /** Note manuscrite, courte. */
  readonly note: string;
  /** Explication complète, pour les lecteurs d'écran. */
  readonly detail: string;
}

export interface ScenePrice {
  readonly lineId: string;
  /** Écart en euros avec la référence. */
  readonly delta: number;
  readonly source: PriceSource;
}

export interface SceneTotals {
  readonly totalHT: number;
  readonly totalVAT: number;
  readonly totalTTC: number;
}

export interface SceneQuote {
  readonly id: string;
  readonly category: string;
  readonly department: string;
  readonly title: string;
  readonly issuedAt: Date;
  readonly validityDays: number;
  readonly vatRate: number;
  readonly lines: readonly SceneLine[];
  /** Totaux tels qu'écrits sur le devis. */
  readonly totals: SceneTotals;
  readonly issues: readonly SceneIssue[];
  readonly prices: readonly ScenePrice[];
  readonly verdict: Verdict;
  readonly correctedAt: Date;
}

/** Arrondi au centime. */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Totaux cohérents à partir des lignes écrites (pour fabriquer des données fictives). */
export function totalsFromLines(lines: readonly SceneLine[], vatRate: number): SceneTotals {
  const totalHT = roundCents(lines.reduce((sum, line) => sum + line.totalHT, 0));
  const totalVAT = roundCents(totalHT * vatRate);
  return { totalHT, totalVAT, totalTTC: roundCents(totalHT + totalVAT) };
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

/**
 * Résumé en une phrase d'une correction, pour les lecteurs d'écran (la démo
 * animée elle-même leur est masquée).
 */
export function describeCorrection(quote: SceneQuote): string {
  const issues =
    quote.issues.length === 0
      ? "aucune erreur"
      : `${plural(quote.issues.length, "problème vérifié", "problèmes vérifiés")} (${quote.issues
          .map((issue) => issue.detail.replace(/\.$/, ""))
          .join(" ; ")})`;
  const prices = plural(quote.prices.length, "avis de prix", "avis de prix");
  return `${quote.title}, ${quote.category.toLowerCase()} : ${issues}, ${prices}. Verdict : ${VERDICT_LABELS[quote.verdict].toLowerCase()}.`;
}
