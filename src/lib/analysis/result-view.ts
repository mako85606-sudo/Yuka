import { UNIT_SYMBOLS } from "@/config/taxonomy";
import type { Finding, PriceOpinion, SavingsRange } from "@/lib/analysis/result";
import { formatEuros, formatQuantity } from "@/lib/format";
import { fr } from "@/lib/typography";

/**
 * Mise en mots du résultat, pour l'écran : quels constats vont où, et comment
 * dire une économie ou une référence de prix sans en rajouter.
 */

export interface FindingGroups {
  /** Erreurs vérifiées : calcul faux, mention absente, lus avec assurance. */
  readonly errors: readonly Finding[];
  /** Points d'attention lus avec assurance : ligne vague, acompte élevé, TVA inhabituelle. */
  readonly warnings: readonly Finding[];
  /** Constats sur des chiffres mal lus : à vérifier sur le devis papier. */
  readonly toConfirm: readonly Finding[];
  /** Rappels utiles (délai de rétractation). */
  readonly reminders: readonly Finding[];
}

export function groupFindings(findings: readonly Finding[]): FindingGroups {
  return {
    errors: findings.filter((finding) => finding.confirmed && finding.kind === "error"),
    warnings: findings.filter((finding) => finding.confirmed && finding.kind === "warning"),
    toConfirm: findings.filter((finding) => !finding.confirmed && finding.kind !== "reminder"),
    reminders: findings.filter((finding) => finding.kind === "reminder"),
  };
}

/** « 21 € », « 40 à 120 € », « jusqu'à 120 € ». */
export function savingsText(savings: SavingsRange): string {
  const high = formatEuros(savings.high, 0);
  if (savings.low === savings.high) return high;
  if (savings.low <= 0) return fr(`jusqu'à ${high}`);
  return fr(`${formatEuros(savings.low, 0).replace(/\s€$/, "")} à ${high}`);
}

/** Vrai si une estimation IA pèse dans l'économie annoncée : on le dit à côté. */
export function savingsRelyOnAi(prices: readonly PriceOpinion[]): boolean {
  return prices.some((opinion) => opinion.source.kind === "ai" && opinion.delta > 0);
}

/** Euros ronds sans centimes (« 600 € »), sinon au centime (« 567,50 € »). */
function euros(amount: number): string {
  return formatEuros(amount, Number.isInteger(amount) ? 0 : 2);
}

function perUnit(amount: number, opinion: PriceOpinion): string {
  return `${euros(amount)} HT / ${UNIT_SYMBOLS[opinion.unit]}`;
}

/** Le prix du devis, dans l'unité comparée : « 890 € HT / u », « 42,50 € HT / u », « 58 € HT / h × 3 ». */
export function quotedPriceText(opinion: PriceOpinion): string {
  const quantity = opinion.quantity === 1 ? "" : ` × ${formatQuantity(opinion.quantity)}`;
  return fr(`${perUnit(opinion.unitPrice, opinion)}${quantity}`);
}

/** Ce à quoi le prix est comparé, en clair. Une estimation IA reste une fourchette, jamais un prix de marché. */
export function referenceText(opinion: PriceOpinion): string {
  const { reference } = opinion;
  if (reference.kind === "ai") {
    return fr(`Fourchette estimée : ${euros(reference.low)} à ${perUnit(reference.high, opinion)}`);
  }
  return fr(
    `Médiane : ${perUnit(reference.median, opinion)} · la moitié des devis entre ${euros(reference.p25)} et ${euros(reference.p75)}`,
  );
}
