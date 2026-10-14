import { anonymizeText } from "@/lib/anonymize";
import { normalizeDepartment } from "@/lib/department";
import type { ExtractedLine, Extraction } from "@/lib/extraction/schema";
import { roundCents } from "@/lib/scene-quote";

/**
 * Nettoie une extraction validée avant de s'en servir : textes anonymisés et
 * raccourcis, département ramené à un code connu, montants arrondis au
 * centime. Ne corrige jamais un montant : un calcul faux doit rester faux pour
 * être signalé ensuite.
 */

export const MAX_LINES = 100;
const MAX_LABEL_LENGTH = 160;
const MAX_SUBJECT_LENGTH = 100;

/** Taux de TVA français en vigueur, en pourcentage. */
const KNOWN_VAT_RATES = [20, 10, 5.5, 2.1, 0];

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function cleanText(text: string, max: number): string {
  return clip(anonymizeText(text.replace(/\s+/g, " ").trim()), max);
}

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Un taux écrit en fraction (0,2 au lieu de 20) est une question d'unité, pas
 * de lecture : on le remet en pourcentage s'il correspond à un taux connu.
 */
function normalizeVatRate(rate: number | undefined): number | undefined {
  if (rate === undefined) return undefined;
  if (rate > 0 && rate < 1) {
    const percent = Math.round(rate * 1000) / 10;
    if (KNOWN_VAT_RATES.includes(percent)) return percent;
  }
  return rate;
}

function inRange(value: number | undefined, min: number, max: number): number | undefined {
  return value !== undefined && value >= min && value <= max ? value : undefined;
}

/** Nettoie une ligne : libellé anonymisé, montants au centime, TVA en pourcentage. */
export function normalizeLine(line: ExtractedLine): ExtractedLine {
  const label = cleanText(line.label, MAX_LABEL_LENGTH);
  return {
    ...line,
    label: label === "" ? "Ligne sans désignation" : label,
    quantity: line.quantity === undefined ? undefined : roundQuantity(line.quantity),
    unitPriceHT: line.unitPriceHT === undefined ? undefined : roundCents(line.unitPriceHT),
    totalHT: line.totalHT === undefined ? undefined : roundCents(line.totalHT),
    vatRate: normalizeVatRate(line.vatRate),
  };
}

/** Objet du devis, anonymisé et raccourci. */
export function cleanSubject(subject: string): string {
  return cleanText(subject, MAX_SUBJECT_LENGTH);
}

function roundOptional(value: number | undefined): number | undefined {
  return value === undefined ? undefined : roundCents(value);
}

export function normalizeExtraction(extraction: Extraction): Extraction {
  const { meta, totals } = extraction;
  return {
    ...extraction,
    subject: cleanSubject(extraction.subject),
    meta: {
      ...meta,
      validityDays: inRange(meta.validityDays, 1, 3650),
      depositPercent: inRange(meta.depositPercent, 0, 100),
      depositAmount: meta.depositAmount === undefined ? undefined : roundCents(meta.depositAmount),
      executionDelayDays: inRange(meta.executionDelayDays, 0, 3650),
      department: normalizeDepartment(meta.department),
    },
    lines: extraction.lines.slice(0, MAX_LINES).map(normalizeLine),
    totals: {
      totalHT: roundOptional(totals.totalHT),
      totalVAT: roundOptional(totals.totalVAT),
      totalTTC: roundOptional(totals.totalTTC),
    },
  };
}
