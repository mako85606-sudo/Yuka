import type { ExtractedLine, Extraction } from "@/lib/extraction/schema";

/**
 * Comparaison d'une lecture avec sa vérité terrain, champ par champ, pour
 * `npm run eval:extraction`. Les montants se comparent au centime près, les
 * libellés par ressemblance (le modèle peut reformuler légèrement), tout le
 * reste à l'identique. Une valeur absente des deux côtés compte comme juste.
 */

export interface FieldResult {
  readonly field: string;
  readonly ok: boolean;
  readonly expected: unknown;
  readonly actual: unknown;
}

const LINE_FIELDS = [
  "label",
  "quantity",
  "unit",
  "unitPriceHT",
  "totalHT",
  "vatRate",
  "canonicalItem",
] as const;

type LineField = (typeof LINE_FIELDS)[number];

/** Seuil de ressemblance au-delà duquel deux libellés désignent la même ligne. */
export const LABEL_SIMILARITY = 0.6;

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word.length > 1);
}

/** Coefficient de Dice sur les mots (0 : rien en commun, 1 : mêmes mots). */
export function labelSimilarity(a: string, b: string): number {
  const left = new Set(normalizeWords(a));
  const right = new Set(normalizeWords(b));
  if (left.size === 0 && right.size === 0) return 1;
  let common = 0;
  for (const word of left) if (right.has(word)) common += 1;
  return (2 * common) / (left.size + right.size);
}

function sameMoney(a: number | undefined, b: number | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return Math.abs(a - b) <= 0.01;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === "number" || typeof b === "number") {
    return sameMoney(a as number | undefined, b as number | undefined);
  }
  return a === b;
}

function compareLineField(field: LineField, expected: ExtractedLine, actual: ExtractedLine | undefined): FieldResult {
  const expectedValue = expected[field];
  const actualValue = actual?.[field];
  const ok =
    actual !== undefined &&
    (field === "label"
      ? labelSimilarity(expected.label, actual.label) >= LABEL_SIMILARITY
      : sameValue(expectedValue, actualValue));
  return { field: `lines.${field}`, ok, expected: expectedValue, actual: actualValue };
}

/**
 * Associe chaque ligne attendue à la ligne lue qui lui ressemble le plus
 * (libellé, puis montant), chaque ligne lue ne servant qu'une fois.
 */
export function alignLines(
  expected: readonly ExtractedLine[],
  actual: readonly ExtractedLine[],
): (ExtractedLine | undefined)[] {
  const used = new Set<number>();
  return expected.map((line) => {
    let best: { index: number; score: number } | undefined;
    actual.forEach((candidate, index) => {
      if (used.has(index)) return;
      const score =
        labelSimilarity(line.label, candidate.label) + (sameMoney(line.totalHT, candidate.totalHT) ? 0.5 : 0);
      if (!best || score > best.score) best = { index, score };
    });
    if (!best || best.score < 0.5) return undefined;
    used.add(best.index);
    return actual[best.index];
  });
}

export function compareExtraction(expected: Extraction, actual: Extraction): FieldResult[] {
  const results: FieldResult[] = [];
  const push = (field: string, expectedValue: unknown, actualValue: unknown) => {
    results.push({ field, ok: sameValue(expectedValue, actualValue), expected: expectedValue, actual: actualValue });
  };

  push("documentKind", expected.documentKind, actual.documentKind);
  push("category", expected.category, actual.category);
  for (const key of Object.keys(expected.issuer) as (keyof Extraction["issuer"])[]) {
    push(`issuer.${key}`, expected.issuer[key], actual.issuer[key]);
  }
  for (const key of [
    "isDoorToDoorSale",
    "quoteDate",
    "validityDays",
    "validUntil",
    "depositPercent",
    "depositAmount",
    "executionDelayDays",
    "department",
  ] as const) {
    push(`meta.${key}`, expected.meta[key], actual.meta[key]);
  }
  for (const key of ["totalHT", "totalVAT", "totalTTC"] as const) {
    push(`totals.${key}`, expected.totals[key], actual.totals[key]);
  }
  push("lines.count", expected.lines.length, actual.lines.length);

  const aligned = alignLines(expected.lines, actual.lines);
  expected.lines.forEach((line, index) => {
    for (const field of LINE_FIELDS) results.push(compareLineField(field, line, aligned[index]));
  });
  return results;
}

/** Données personnelles d'un devis de test qui ne doivent jamais ressortir de la lecture. */
export function findLeaks(actual: unknown, personalValues: readonly string[]): string[] {
  const haystack = JSON.stringify(actual).toLowerCase();
  return personalValues.filter((value) => value.length >= 4 && haystack.includes(value.toLowerCase()));
}

export interface FieldTally {
  readonly field: string;
  readonly correct: number;
  readonly total: number;
}

/** Additionne les résultats par champ, dans l'ordre de première apparition. */
export function tallyByField(results: readonly FieldResult[]): FieldTally[] {
  const tallies = new Map<string, { correct: number; total: number }>();
  for (const result of results) {
    const tally = tallies.get(result.field) ?? { correct: 0, total: 0 };
    tally.total += 1;
    if (result.ok) tally.correct += 1;
    tallies.set(result.field, tally);
  }
  return [...tallies].map(([field, tally]) => ({ field, ...tally }));
}
