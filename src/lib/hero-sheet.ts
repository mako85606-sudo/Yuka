import type { TypedRow } from "@/lib/choreography";
import { formatAmount, formatQuantity, formatRate, formatSignedEuros } from "@/lib/format";
import { describeDelta, type PriceSource } from "@/lib/price-wording";
import { roundCents, type SceneLine, type SceneQuote } from "@/lib/scene-quote";

/**
 * Ce que le stylo écrit sur une ligne de la feuille du hero, quand il passe
 * dessus. Toujours tiré des constats du devis : une erreur de calcul est
 * entourée et corrigée en rouge, une ligne vague surlignée, un prix commenté
 * en bleu avec sa source, une ligne sans reproche reçoit une coche.
 */
export type HeroMark =
  | { readonly kind: "calculation"; readonly correct: string; readonly note: string }
  | { readonly kind: "vague"; readonly note: string }
  | { readonly kind: "price"; readonly note: string; readonly caption: string }
  | { readonly kind: "ok"; readonly note: string };

/**
 * Source d'un avis de prix, en une ligne de marge : la base Loupe et son
 * nombre de devis, ou la confiance d'une estimation IA (la note dit déjà
 * « estimation IA »).
 */
export function marginSource(source: PriceSource): string {
  return source.kind === "loupe" ? `Base Loupe · ${source.comparables} devis` : "Confiance faible";
}

/** Montant écrit à la main par le correcteur : « 260 », « 18,50 ». */
export function handAmount(value: number): string {
  const rounded = roundCents(value);
  return Number.isInteger(rounded) ? formatQuantity(rounded) : formatAmount(rounded);
}

export function heroMark(quote: SceneQuote, line: SceneLine): HeroMark {
  const issue = quote.issues.find((item) => item.lineId === line.id);
  if (issue?.kind === "calculation") {
    return { kind: "calculation", correct: handAmount(line.quantity * line.unitPriceHT), note: issue.note };
  }
  if (issue) return { kind: "vague", note: issue.note };
  const price = quote.prices.find((item) => item.lineId === line.id);
  if (price) {
    return {
      kind: "price",
      note: `${formatSignedEuros(price.delta)} ${describeDelta(price.delta, price.source)}`,
      caption: marginSource(price.source),
    };
  }
  return { kind: "ok", note: "Rien à redire" };
}

/** La ligne que le stylo corrige d'emblée : la première erreur de calcul, sinon le premier constat. */
export function heroFocusLine(quote: SceneQuote): SceneLine | undefined {
  const issue = quote.issues.find((item) => item.kind === "calculation") ?? quote.issues[0];
  return quote.lines.find((line) => line.id === issue?.lineId);
}

/** Ce qui est imprimé sur une ligne : libellé, détail du calcul, montant. */
export function printedLine(line: SceneLine): { label: string; detail: string; amount: string } {
  return {
    label: line.label,
    detail: `${formatQuantity(line.quantity)} ${line.unit} × ${formatAmount(line.unitPriceHT)}`,
    amount: formatAmount(line.totalHT),
  };
}

/** Les totaux imprimés au pied du devis. */
export function printedTotals(quote: SceneQuote): { label: string; amount: string; strong?: boolean }[] {
  return [
    { label: "Total HT", amount: formatAmount(quote.totals.totalHT) },
    { label: `TVA ${formatRate(quote.vatRate)}`, amount: formatAmount(quote.totals.totalVAT) },
    { label: "Total TTC", amount: `${formatAmount(quote.totals.totalTTC)} €`, strong: true },
  ];
}

/** Les rangées à taper, dans l'ordre : les lignes, puis les totaux. */
export function heroRows(quote: SceneQuote): TypedRow[] {
  return [
    ...quote.lines.map((line) => {
      const printed = printedLine(line);
      return { label: printed.label.length, detail: printed.detail.length, amount: printed.amount.length };
    }),
    ...printedTotals(quote).map((total) => ({ label: total.label.length, detail: 0, amount: total.amount.length })),
  ];
}
