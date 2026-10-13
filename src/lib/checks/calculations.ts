import { UNIT_SYMBOLS } from "@/config/taxonomy";
import type { Finding } from "@/lib/analysis/result";
import type { ExtractedLine, Extraction } from "@/lib/extraction/schema";
import { formatEuros, formatRate } from "@/lib/format";
import { roundCents } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";
import { isSure, matches, noteAmount, noteQuantity } from "./shared";

/**
 * Les calculs du devis, refaits en TypeScript : jamais par le modèle. Un
 * montant imprimé faux reste un constat, quel que soit son sens (en faveur
 * ou en défaveur du client) ; `amount` dit qui y perd.
 */

function quantityWithUnit(line: ExtractedLine): string {
  const quantity = noteQuantity(line.quantity ?? 1);
  return line.unit ? `${quantity} ${UNIT_SYMBOLS[line.unit]}` : quantity;
}

/** Quantité × prix unitaire = montant de la ligne. */
export function checkLineCalculations(extraction: Extraction): Finding[] {
  const findings: Finding[] = [];
  extraction.lines.forEach((line, index) => {
    const { quantity, unitPriceHT, totalHT } = line;
    if (quantity === undefined || unitPriceHT === undefined || totalHT === undefined) return;
    const expected = roundCents(quantity * unitPriceHT);
    if (matches(expected, totalHT)) return;
    findings.push({
      id: `line-calculation-${index}`,
      ruleId: "line-calculation",
      kind: "error",
      confirmed: isSure(line.confidence),
      lineIndex: index,
      note: `${noteQuantity(quantity)} × ${noteAmount(unitPriceHT)} = ${noteAmount(expected)}, pas ${noteAmount(totalHT)}`,
      detail: fr(
        `Erreur de calcul ligne ${index + 1} : ${quantityWithUnit(line)} × ${formatEuros(unitPriceHT)} font ${formatEuros(expected)}, le devis indique ${formatEuros(totalHT)}.`,
      ),
      amount: roundCents(totalHT - expected),
      ruleVerified: true,
    });
  });
  return findings;
}

/** La somme des lignes = le total HT. */
export function checkTotalHT(extraction: Extraction): Finding[] {
  const { lines, totals, confidence } = extraction;
  if (totals.totalHT === undefined || lines.length === 0) return [];
  if (lines.some((line) => line.totalHT === undefined)) return [];
  const sum = roundCents(lines.reduce((total, line) => total + (line.totalHT ?? 0), 0));
  if (matches(sum, totals.totalHT, lines.length)) return [];
  return [
    {
      id: "total-ht",
      ruleId: "total-ht",
      kind: "error",
      confirmed: isSure(confidence.totals, ...lines.map((line) => line.confidence)),
      note: `Total des lignes : ${noteAmount(sum)}, pas ${noteAmount(totals.totalHT)}`,
      detail: fr(
        `Les lignes du devis totalisent ${formatEuros(sum)} HT, mais le total HT indiqué est de ${formatEuros(totals.totalHT)}.`,
      ),
      amount: roundCents(totals.totalHT - sum),
      ruleVerified: true,
    },
  ];
}

interface ExpectedVat {
  readonly expected: number;
  /** Base et taux, quand un seul taux vaut pour tout le devis. */
  readonly base?: number;
  readonly rate?: number;
  readonly lineCount: number;
}

/** TVA attendue d'après les taux des lignes ; `null` si on ne peut pas la recalculer. */
export function expectedVat(extraction: Extraction): ExpectedVat | null {
  const { lines, totals } = extraction;
  if (lines.length === 0 || lines.some((line) => line.vatRate === undefined)) return null;
  const rates = new Set(lines.map((line) => line.vatRate ?? 0));
  if (rates.size === 1) {
    const [rate = 0] = rates;
    const base =
      totals.totalHT ??
      (lines.every((line) => line.totalHT !== undefined)
        ? lines.reduce((total, line) => total + (line.totalHT ?? 0), 0)
        : undefined);
    if (base === undefined) return null;
    return { expected: roundCents((base * rate) / 100), base, rate, lineCount: 1 };
  }
  if (lines.some((line) => line.totalHT === undefined)) return null;
  const byRate = new Map<number, number>();
  for (const line of lines) {
    const rate = line.vatRate ?? 0;
    byRate.set(rate, (byRate.get(rate) ?? 0) + (line.totalHT ?? 0));
  }
  let expected = 0;
  for (const [rate, base] of byRate) expected += roundCents((base * rate) / 100);
  return { expected: roundCents(expected), lineCount: lines.length };
}

/** Le montant de TVA correspond aux taux indiqués. */
export function checkTotalVAT(extraction: Extraction): Finding[] {
  const { totals, confidence, lines } = extraction;
  if (totals.totalVAT === undefined) return [];
  const vat = expectedVat(extraction);
  if (!vat || matches(vat.expected, totals.totalVAT, vat.lineCount)) return [];
  const how =
    vat.rate !== undefined && vat.base !== undefined
      ? `${formatRate(vat.rate / 100)} de ${formatEuros(vat.base)}`
      : "selon les taux de chaque ligne";
  return [
    {
      id: "total-vat",
      ruleId: "total-vat",
      kind: "error",
      confirmed: isSure(confidence.totals, ...lines.map((line) => line.confidence)),
      note: `TVA : ${noteAmount(vat.expected)}, pas ${noteAmount(totals.totalVAT)}`,
      detail: fr(
        `La TVA devrait être de ${formatEuros(vat.expected)} (${how}), le devis indique ${formatEuros(totals.totalVAT)}.`,
      ),
      amount: roundCents(totals.totalVAT - vat.expected),
      ruleVerified: true,
    },
  ];
}

/** Total HT + TVA = total TTC. */
export function checkTotalTTC(extraction: Extraction): Finding[] {
  const { totals, confidence } = extraction;
  if (totals.totalHT === undefined || totals.totalTTC === undefined) return [];
  let vat = totals.totalVAT;
  if (vat === undefined) {
    const computed = expectedVat(extraction);
    if (computed?.rate === undefined) return [];
    vat = computed.expected;
  }
  const expected = roundCents(totals.totalHT + vat);
  if (matches(expected, totals.totalTTC)) return [];
  return [
    {
      id: "total-ttc",
      ruleId: "total-ttc",
      kind: "error",
      confirmed: isSure(confidence.totals),
      note: `HT + TVA = ${noteAmount(expected)}, pas ${noteAmount(totals.totalTTC)}`,
      detail: fr(
        `Le total HT plus la TVA font ${formatEuros(expected)}, le devis indique ${formatEuros(totals.totalTTC)} TTC.`,
      ),
      amount: roundCents(totals.totalTTC - expected),
      ruleVerified: true,
    },
  ];
}
