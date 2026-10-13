import { verdictConfig } from "@/config/verdict";
import { formatEuros } from "@/lib/format";
import { roundCents, type SceneQuote, type Verdict } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";

/**
 * Ce qu'une démo annonce à la fin de sa correction : le verdict et
 * l'économie possible, tirés des mêmes règles que l'analyse réelle
 * (`src/lib/verdict.ts`, seuils `src/config/verdict.ts`), réduites à ce
 * qu'un devis fictif connaît : ses lignes, ses erreurs et l'écart de chaque
 * avis de prix. Une démo ne promet donc rien que Loupe ne dirait pas d'un
 * vrai devis identique.
 */

/** Devis d'une démo, avec l'aperçu du message qu'on enverrait. */
export interface DemoQuote extends SceneQuote {
  /**
   * Début du message de négociation (vouvoiement, factuel, une question),
   * fondé seulement sur les erreurs vérifiées. Absent : rien à négocier.
   */
  readonly message?: string;
}

/**
 * Trop-payé dû aux erreurs de calcul, TTC : comme `computeOvercharge`, le
 * total imprimé moins le total recalculé. Zéro si l'erreur joue en faveur du
 * client.
 */
export function demoOvercharge(quote: SceneQuote): number {
  const written = quote.lines.reduce((sum, line) => sum + line.totalHT, 0);
  const expected = quote.lines.reduce((sum, line) => sum + roundCents(line.quantity * line.unitPriceHT), 0);
  return Math.max(0, roundCents((written - expected) * (1 + quote.vatRate)));
}

/** Écart relatif à la médiane d'un avis de la base Loupe (l'écart porte sur le montant de la ligne). */
function loupeRatios(quote: SceneQuote): number[] {
  return quote.prices.flatMap((price) => {
    if (price.source.kind !== "loupe") return [];
    const line = quote.lines.find((item) => item.id === price.lineId);
    const median = line ? line.totalHT - price.delta : 0;
    return median > 0 ? [price.delta / median] : [];
  });
}

/** Le verdict que les règles de l'analyse réelle rendraient pour ce devis. */
export function demoVerdict(quote: SceneQuote): Verdict {
  const ratios = loupeRatios(quote);
  if (
    demoOvercharge(quote) >= verdictConfig.alertOvercharge ||
    ratios.some((ratio) => ratio >= verdictConfig.alertPriceRatio)
  ) {
    return "alert";
  }
  if (
    quote.issues.length > 0 ||
    ratios.some((ratio) => ratio >= verdictConfig.negotiatePriceRatio) ||
    quote.prices.some((price) => price.source.kind === "ai" && Math.round(price.delta) > 0)
  ) {
    return "negotiate";
  }
  return "ok";
}

/**
 * Économie possible, arrondie à l'euro : le haut de la fourchette de
 * l'analyse réelle (trop-payé, plus chaque écart au-dessus de la référence).
 * `null` pour un devis correct ou une économie trop faible pour être annoncée.
 */
export function demoSavings(quote: SceneQuote): number | null {
  if (demoVerdict(quote) === "ok") return null;
  const above = quote.prices.reduce((sum, price) => sum + Math.max(0, price.delta), 0);
  const high = demoOvercharge(quote) + above;
  return high < verdictConfig.minSavings ? null : Math.round(high);
}

/** « jusqu'à 219 € », ou `null` s'il n'y a rien à annoncer. */
export function demoSavingsText(quote: SceneQuote): string | null {
  const savings = demoSavings(quote);
  return savings === null ? null : fr(`jusqu'à ${formatEuros(savings, 0)}`);
}

/** La fin de la démo en une phrase, pour les lecteurs d'écran (la démo animée leur est masquée). */
export function describeOutcome(quote: DemoQuote): string {
  const savings = demoSavingsText(quote);
  if (savings === null) return "Rien à négocier.";
  const message = quote.message ? fr(` Message proposé : « ${quote.message} »`) : "";
  return fr(`Économie possible : ${savings}.`) + message;
}
