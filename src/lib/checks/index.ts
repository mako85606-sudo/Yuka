import type { Finding } from "@/lib/analysis/result";
import type { Extraction } from "@/lib/extraction/schema";
import { checkLineCalculations, checkTotalHT, checkTotalTTC, checkTotalVAT } from "./calculations";
import { checkDeposit } from "./deposit";
import { checkDoorToDoor } from "./door-to-door";
import { checkMentions } from "./mentions";
import { checkVagueLines } from "./vague-lines";
import { checkUnknownVatRates, checkVatRatesForCategory } from "./vat-rates";

/**
 * Toutes les vérifications déterministes, dans l'ordre où un correcteur les
 * ferait : les calculs, la TVA, les mentions, puis les points d'attention.
 * Aucune n'est confiée au modèle.
 */
export const CHECKS: readonly ((extraction: Extraction) => Finding[])[] = [
  checkLineCalculations,
  checkTotalHT,
  checkTotalVAT,
  checkTotalTTC,
  checkUnknownVatRates,
  checkVatRatesForCategory,
  checkMentions,
  checkDeposit,
  checkDoorToDoor,
  checkVagueLines,
];

export function runChecks(extraction: Extraction): Finding[] {
  return CHECKS.flatMap((check) => check(extraction));
}

export { computeOvercharge } from "./overcharge";
