import { CRITICAL_MENTIONS, verdictConfig } from "@/config/verdict";
import type { Finding, PriceOpinion, SavingsRange, VerdictResult } from "@/lib/analysis/result";
import type { Extraction } from "@/lib/extraction/schema";
import { formatEuros, formatSignedEuros } from "@/lib/format";
import type { Verdict } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";

/**
 * Le verdict, en TypeScript : il ne dépend que des constats vérifiés, des
 * avis de prix et de ce que les erreurs coûtent. Une estimation IA peut
 * inviter à négocier, jamais à « vérifier sérieusement ».
 */

export interface VerdictInput {
  readonly extraction: Extraction;
  readonly findings: readonly Finding[];
  readonly prices: readonly PriceOpinion[];
  /** Trop-payé dû aux erreurs de calcul (`computeOvercharge`), `null` si on ne peut pas le chiffrer. */
  readonly overcharge: number | null;
}

const CALCULATION_RULES = new Set(["line-calculation", "total-ht", "total-vat", "total-ttc"]);

/** Écart relatif à la médiane, pour un avis de la base Loupe. */
function priceRatio(opinion: PriceOpinion): number | null {
  if (opinion.reference.kind !== "loupe" || opinion.reference.median <= 0) return null;
  return (opinion.unitPrice - opinion.reference.median) / opinion.reference.median;
}

/** Ce que les erreurs coûtent : le trop-payé recalculé, sinon le plus gros écart vérifié. */
function verifiedLoss(input: VerdictInput): number {
  if (input.overcharge !== null) return input.overcharge;
  const amounts = input.findings
    .filter((finding) => finding.confirmed && CALCULATION_RULES.has(finding.ruleId))
    .map((finding) => finding.amount ?? 0);
  return Math.max(0, ...amounts);
}

function decide(input: VerdictInput, loss: number): Verdict {
  const { findings, prices } = input;
  const confirmedErrors = findings.filter((finding) => finding.kind === "error" && finding.confirmed);
  const ratios = prices.map(priceRatio).filter((ratio): ratio is number => ratio !== null);

  if (
    loss >= verdictConfig.alertOvercharge ||
    confirmedErrors.some((finding) => CRITICAL_MENTIONS.includes(finding.ruleId)) ||
    ratios.some((ratio) => ratio >= verdictConfig.alertPriceRatio)
  ) {
    return "alert";
  }
  if (
    findings.some((finding) => finding.kind !== "reminder") ||
    ratios.some((ratio) => ratio >= verdictConfig.negotiatePriceRatio) ||
    prices.some((opinion) => opinion.source.kind === "ai" && opinion.delta > 0)
  ) {
    return "negotiate";
  }
  return "ok";
}

function savingsRange(input: VerdictInput, verdict: Verdict, loss: number): SavingsRange | null {
  // Un devis « Correct » n'a rien à négocier : pas d'économie annoncée.
  if (verdict === "ok") return null;
  let low = loss;
  let high = loss;
  for (const opinion of input.prices) {
    const { reference, unitPrice, quantity } = opinion;
    if (reference.kind === "loupe") {
      low += Math.max(0, unitPrice - reference.p75) * quantity;
      high += Math.max(0, unitPrice - reference.median) * quantity;
    } else {
      high += Math.max(0, opinion.delta);
    }
  }
  if (high < verdictConfig.minSavings) return null;
  // Au centime : l'affichage arrondit vers le bas (`savingsText`), jamais au-dessus de l'économie réelle.
  return { low: Math.round(low * 100) / 100, high: Math.round(high * 100) / 100 };
}

function lineLabel(input: VerdictInput, index: number): string {
  return input.extraction.lines[index]?.label ?? `Ligne ${index + 1}`;
}

/** Ce qui a pu être vérifié sans rien trouver, pour un devis « Correct ». */
function reassurances(input: VerdictInput): string[] {
  const { extraction, prices } = input;
  const points: string[] = [];
  const computable = extraction.lines.some(
    (line) => line.quantity !== undefined && line.unitPriceHT !== undefined && line.totalHT !== undefined,
  );
  if (computable && extraction.totals.totalTTC !== undefined) points.push("Les calculs sont justes.");
  points.push("Les mentions attendues sont là.");
  if (prices.some((opinion) => opinion.source.kind === "loupe")) {
    points.push("Les prix comparés sont dans la norme de votre région.");
  }
  return points;
}

function keyPoints(input: VerdictInput, verdict: Verdict, loss: number): string[] {
  const reminders = input.findings.filter((finding) => finding.kind === "reminder").map((finding) => finding.detail);
  if (verdict === "ok") {
    // Un rappel utile (délai de rétractation) passe avant la dernière réassurance.
    const reassured = reassurances(input);
    return [...reassured.slice(0, 2), ...reminders, ...reassured.slice(2)].slice(0, verdictConfig.maxKeyPoints);
  }
  const points: string[] = [];
  const confirmed = input.findings.filter((finding) => finding.confirmed && finding.kind !== "reminder");

  if (loss >= 1) {
    points.push(fr(`Les erreurs de calcul vous font payer ${formatEuros(loss)} de trop.`));
  } else {
    const calculation = confirmed.find((finding) => CALCULATION_RULES.has(finding.ruleId));
    if (calculation) points.push(calculation.detail);
  }
  for (const finding of confirmed) {
    if (CRITICAL_MENTIONS.includes(finding.ruleId)) points.push(finding.detail);
  }

  const expensive = input.prices
    .map((opinion) => ({ opinion, ratio: priceRatio(opinion) }))
    .filter(({ ratio }) => ratio !== null && ratio >= verdictConfig.negotiatePriceRatio)
    .sort((a, b) => b.opinion.delta - a.opinion.delta);
  for (const { opinion } of expensive) {
    const comparables = opinion.reference.kind === "loupe" ? opinion.reference.comparables : 0;
    points.push(
      fr(
        `${lineLabel(input, opinion.lineIndex)} : ${formatSignedEuros(opinion.delta)} au-dessus de la médiane de ${comparables} devis comparables.`,
      ),
    );
  }

  for (const finding of confirmed) {
    if (CALCULATION_RULES.has(finding.ruleId) || CRITICAL_MENTIONS.includes(finding.ruleId)) continue;
    points.push(finding.detail);
  }
  for (const opinion of input.prices) {
    if (opinion.source.kind === "ai" && opinion.delta > 0) {
      points.push(
        fr(
          `${lineLabel(input, opinion.lineIndex)} : au-dessus de la fourchette estimée par l'IA (confiance faible), à faire justifier.`,
        ),
      );
    }
  }
  for (const finding of input.findings) {
    if (!finding.confirmed && finding.kind !== "reminder") {
      points.push(fr(`À confirmer sur votre devis : ${finding.detail.charAt(0).toLowerCase()}${finding.detail.slice(1)}`));
    }
  }
  points.push(...reminders);
  return [...new Set(points)].slice(0, verdictConfig.maxKeyPoints);
}

export function decideVerdict(input: VerdictInput): VerdictResult {
  const loss = Math.round(verifiedLoss(input) * 100) / 100;
  const verdict = decide(input, loss);
  return {
    verdict,
    savings: savingsRange(input, verdict, loss),
    keyPoints: keyPoints(input, verdict, loss),
    overcharge: input.overcharge,
  };
}
