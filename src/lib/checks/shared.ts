import { checksConfig } from "@/config/checks";
import type { Confidence } from "@/lib/extraction/schema";
import { roundCents } from "@/lib/scene-quote";

/** Écart toléré entre un montant attendu et un montant imprimé (arrondis compris). */
export function tolerance(expected: number, lineCount = 1): number {
  return Math.max(
    checksConfig.toleranceEuros,
    Math.abs(expected) * checksConfig.toleranceRatio,
    lineCount * checksConfig.tolerancePerLine,
  );
}

/** Vrai si le montant imprimé correspond au montant attendu, aux arrondis près. */
export function matches(expected: number, printed: number, lineCount = 1): boolean {
  return Math.abs(roundCents(expected) - printed) <= tolerance(expected, lineCount) + 1e-9;
}

/** Un constat ne vaut que si les chiffres en cause ont été lus avec assurance. */
export function isSure(...levels: readonly (Confidence | undefined)[]): boolean {
  return levels.every((level) => level !== "low");
}

const wholeNumber = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const withCents = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Montant d'une note de marge : « 260 » s'il est rond, « 189,90 » sinon. */
export function noteAmount(value: number): string {
  const rounded = roundCents(value);
  return Number.isInteger(rounded) ? wholeNumber.format(rounded) : withCents.format(rounded);
}

/** Quantité d'une note de marge : « 4 », « 1,5 ». */
export function noteQuantity(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value);
}
