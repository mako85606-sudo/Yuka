import type { Extraction } from "@/lib/extraction/schema";
import { roundCents } from "@/lib/scene-quote";

/**
 * Ce que le devis facture en trop à cause de ses erreurs de calcul : le TTC
 * imprimé moins le TTC qu'on obtient en refaisant tous les calculs à partir
 * des quantités et des prix unitaires. Zéro si les erreurs ne coûtent rien
 * au client (ou jouent en sa faveur) ; `null` si le devis ne donne pas de
 * quoi tout recalculer.
 */
export function computeOvercharge(extraction: Extraction): number | null {
  const { lines, totals } = extraction;
  if (lines.length === 0 || totals.totalTTC === undefined) return null;
  const byRate = new Map<number, number>();
  for (const line of lines) {
    const amount =
      line.quantity !== undefined && line.unitPriceHT !== undefined
        ? roundCents(line.quantity * line.unitPriceHT)
        : line.totalHT;
    if (amount === undefined || line.vatRate === undefined) return null;
    byRate.set(line.vatRate, (byRate.get(line.vatRate) ?? 0) + amount);
  }
  let expectedTTC = 0;
  for (const [rate, base] of byRate) {
    expectedTTC += roundCents(base) + roundCents((base * rate) / 100);
  }
  return Math.max(0, roundCents(totals.totalTTC - expectedTTC));
}
