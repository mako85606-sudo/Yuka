import { anonymizeText } from "@/lib/anonymize";
import { normalizeDepartment } from "@/lib/department";
import type { ExtractedLine, Extraction } from "@/lib/extraction/schema";
import { roundCents } from "@/lib/scene-quote";

/**
 * Nettoie une extraction validée avant de s'en servir : textes anonymisés et
 * raccourcis, département ramené à un code connu, montants arrondis au
 * centime. Ne corrige jamais un montant : un calcul faux doit rester faux pour
 * être signalé ensuite. Un montant hors de toute plausibilité (plus d'un
 * million d'euros, infini) n'est pas un montant de devis : il est écarté, pour
 * ne fausser ni les calculs ni la base de prix.
 */

export const MAX_LINES = 100;
const MAX_LABEL_LENGTH = 160;
const MAX_SUBJECT_LENGTH = 100;

/** Plus grand montant retenu, en euros, en valeur absolue (une remise est négative). */
export const MAX_AMOUNT = 1_000_000;
/** Plus grande quantité retenue sur une ligne. */
export const MAX_QUANTITY = 100_000;

/** Taux de TVA français en vigueur, en pourcentage. */
const KNOWN_VAT_RATES = [20, 10, 5.5, 2.1, 0];

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Texte nettoyé : raccourci une première fois avant le filtre anti-données
 * personnelles (un texte démesuré ne doit pas le ralentir), puis à sa taille.
 * Tout ce que la première coupe abîme disparaît à la seconde.
 */
function cleanText(text: string, max: number): string {
  return clip(anonymizeText(clip(text.replace(/\s+/g, " ").trim(), max * 2)), max);
}

function amount(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && Math.abs(value) <= MAX_AMOUNT
    ? roundCents(value)
    : undefined;
}

function quantity(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && Math.abs(value) <= MAX_QUANTITY
    ? Math.round(value * 1000) / 1000
    : undefined;
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

/** Nettoie une ligne : libellé anonymisé, montants au centime (bornés), TVA en pourcentage. */
export function normalizeLine(line: ExtractedLine): ExtractedLine {
  const label = cleanText(line.label, MAX_LABEL_LENGTH);
  return {
    ...line,
    label: label === "" ? "Ligne sans désignation" : label,
    quantity: quantity(line.quantity),
    unitPriceHT: amount(line.unitPriceHT),
    totalHT: amount(line.totalHT),
    vatRate: normalizeVatRate(line.vatRate),
  };
}

/** Objet du devis, anonymisé et raccourci. */
export function cleanSubject(subject: string): string {
  return cleanText(subject, MAX_SUBJECT_LENGTH);
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
      depositAmount: amount(meta.depositAmount),
      executionDelayDays: inRange(meta.executionDelayDays, 0, 3650),
      department: normalizeDepartment(meta.department),
    },
    lines: extraction.lines.slice(0, MAX_LINES).map(normalizeLine),
    totals: {
      totalHT: amount(totals.totalHT),
      totalVAT: amount(totals.totalVAT),
      totalTTC: amount(totals.totalTTC),
    },
  };
}
