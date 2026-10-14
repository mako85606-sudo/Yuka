/**
 * Formats d'affichage en français : montants, quantités, taux, dates.
 *
 * Règles typographiques : séparateur de milliers en espace fine insécable
 * (U+202F, fourni par Intl), espace insécable avant « € » et « % », et un vrai
 * signe moins (U+2212) au lieu du tiret.
 */

export const MINUS_SIGN = "−";

const PARIS = "Europe/Paris";

const eurosWithCents = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeEuros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const signedWholeEuros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});

const plainAmount = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});

const percentFormat = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 1,
});

const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: PARIS,
});

const stampDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: PARIS,
});

function withTrueMinus(text: string): string {
  return text.replace("-", MINUS_SIGN);
}

/** « 1 315,50 € » (ou « 1 316 € » avec `decimals: 0`). */
export function formatEuros(value: number, decimals: 0 | 2 = 2): string {
  const formatter = decimals === 0 ? wholeEuros : eurosWithCents;
  return withTrueMinus(formatter.format(value));
}

/** Écart signé en euros entiers : « +340 € », « −120 € », « 0 € ». */
export function formatSignedEuros(value: number): string {
  // Arrondi avant formatage pour ne jamais afficher « −0 € ».
  const rounded = Math.round(value);
  return withTrueMinus(signedWholeEuros.format(rounded === 0 ? 0 : rounded));
}

/** Montant de colonne de devis, sans symbole : « 1 315,00 ». */
export function formatAmount(value: number): string {
  return withTrueMinus(plainAmount.format(value));
}

/** Quantité : « 4 », « 2,5 ». */
export function formatQuantity(value: number): string {
  return withTrueMinus(quantityFormat.format(value));
}

/** Taux exprimé en fraction : 0.1 → « 10 % », 0.055 → « 5,5 % ». */
export function formatRate(rate: number): string {
  return withTrueMinus(percentFormat.format(rate));
}

/** Date courte, heure de Paris : « 12/09/2026 ». */
export function formatShortDate(date: Date): string {
  return shortDate.format(date);
}

/** Date du tampon, heure de Paris : « 03 oct. 2026 ». */
export function formatStampDate(date: Date): string {
  return stampDate.format(date);
}
