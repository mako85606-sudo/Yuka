import { UNIT_SYMBOLS } from "@/config/taxonomy";
import type { LiveLine } from "@/lib/analysis/live-state";
import type { ExtractedLine, ExtractionTotals } from "@/lib/extraction/schema";
import type { PrintedLine, PrintedTotals } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";

/** Passage d'une lecture au devis reconstruit : ce qui manque reste vide. */

export function printedLine({ index, line }: LiveLine): PrintedLine {
  return {
    id: `ligne-${index + 1}`,
    label: fr(line.label),
    quantity: line.quantity ?? null,
    unit: line.unit ? UNIT_SYMBOLS[line.unit] : null,
    unitPriceHT: line.unitPriceHT ?? null,
    totalHT: line.totalHT ?? null,
  };
}

export function printedTotals(totals: ExtractionTotals): PrintedTotals {
  return {
    totalHT: totals.totalHT ?? null,
    totalVAT: totals.totalVAT ?? null,
    totalTTC: totals.totalTTC ?? null,
  };
}

/** Taux de TVA commun à toutes les lignes, en fraction (0,1) ; `null` s'il varie ou manque. */
export function commonVatRate(lines: readonly ExtractedLine[]): number | null {
  const rates = new Set(lines.map((line) => line.vatRate).filter((rate) => rate !== undefined));
  if (rates.size !== 1) return null;
  const [rate] = rates;
  return rate === undefined ? null : rate / 100;
}
