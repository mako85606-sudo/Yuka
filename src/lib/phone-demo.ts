import type { DemoQuote } from "@/lib/demo-outcome";
import { demoSavings } from "@/lib/demo-outcome";
import { formatEuros, formatQuantity, formatSignedEuros } from "@/lib/format";
import { describeDelta, describeSource } from "@/lib/price-wording";
import { roundCents, VERDICT_LABELS, type SceneLine, type Verdict } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";

/**
 * Ce que l'écran de résultat du téléphone (haut de page) affiche, tiré d'un
 * devis de démo par les mêmes règles que l'analyse réelle : l'économie est
 * celle de `demoSavings`, chaque erreur de calcul est recalculée, chaque avis
 * de prix dit sa source. Les erreurs vérifiées passent avant les points
 * d'attention, eux-mêmes avant les avis de prix.
 */

export type PhoneFinding =
  | {
      readonly kind: "calculation";
      readonly id: string;
      readonly label: string;
      /** « 4 h × 65 € » */
      readonly operation: string;
      /** Le montant imprimé, faux, barré à l'écran. */
      readonly printed: string;
      /** Le bon montant, à côté. */
      readonly corrected: string;
    }
  | {
      readonly kind: "vague-line";
      readonly id: string;
      readonly label: string;
      readonly amount: string;
      readonly note: string;
    }
  | {
      readonly kind: "price";
      readonly id: string;
      readonly label: string;
      /** « +190 € » */
      readonly delta: string;
      /** « au-dessus de la médiane », « au-dessus de l'estimation IA » */
      readonly comparison: string;
      /** « Base Loupe · 23 devis comparables », « Estimation IA · confiance faible » */
      readonly source: string;
      /** La même chose, assez courte pour une carte : « Base Loupe · 23 devis », « Confiance faible » (la pastille dit « Estimation IA »). */
      readonly shortSource: string;
      /** Vrai pour une estimation IA : jamais présentée comme un prix de marché. */
      readonly estimate: boolean;
    };

export interface PhoneResult {
  readonly verdict: Verdict;
  readonly verdictLabel: string;
  /** Haut de la fourchette d'économie, à l'euro ; `null` s'il n'y a rien à annoncer. */
  readonly savings: number | null;
  readonly totalTTC: string;
  readonly findings: readonly PhoneFinding[];
}

/** Libellés des pastilles, par type de constat. */
export const FINDING_TAGS = {
  calculation: "Erreur de calcul",
  "vague-line": "À préciser",
  price: "Prix élevé",
  estimate: "Estimation IA",
} as const;

function lineOf(quote: DemoQuote, lineId: string): SceneLine {
  const line = quote.lines.find((item) => item.id === lineId);
  if (!line) throw new Error(`Ligne inconnue dans la démo ${quote.id} : ${lineId}`);
  return line;
}

/** Le libellé court d'une ligne : avant la première virgule (« Chauffe-eau 200 L »). */
function shortLabel(line: SceneLine): string {
  return line.label.split(",")[0]?.trim() ?? line.label;
}

export function phoneResult(quote: DemoQuote): PhoneResult {
  const calculations: PhoneFinding[] = [];
  const vague: PhoneFinding[] = [];
  for (const issue of quote.issues) {
    const line = lineOf(quote, issue.lineId);
    if (issue.kind === "calculation") {
      calculations.push({
        kind: "calculation",
        id: issue.id,
        label: shortLabel(line),
        operation: fr(`${formatQuantity(line.quantity)} ${line.unit} × ${formatEuros(line.unitPriceHT, 0)}`),
        printed: formatEuros(line.totalHT),
        corrected: formatEuros(roundCents(line.quantity * line.unitPriceHT)),
      });
    } else {
      vague.push({
        kind: "vague-line",
        id: issue.id,
        label: shortLabel(line),
        amount: formatEuros(line.totalHT),
        note: issue.note,
      });
    }
  }

  // Les avis de la base Loupe passent avant les estimations IA ; un prix sous la référence n'a pas sa carte.
  const prices = quote.prices
    .filter((price) => Math.round(price.delta) > 0)
    .sort((a, b) => Number(a.source.kind === "ai") - Number(b.source.kind === "ai"))
    .map((price): PhoneFinding => ({
      kind: "price",
      id: `prix-${price.lineId}`,
      label: shortLabel(lineOf(quote, price.lineId)),
      delta: formatSignedEuros(price.delta),
      comparison: describeDelta(price.delta, price.source),
      source: describeSource(price.source),
      shortSource: price.source.kind === "ai" ? "Confiance faible" : `Base Loupe · ${price.source.comparables} devis`,
      estimate: price.source.kind === "ai",
    }));

  return {
    verdict: quote.verdict,
    verdictLabel: VERDICT_LABELS[quote.verdict],
    savings: demoSavings(quote),
    totalTTC: formatEuros(quote.totals.totalTTC),
    findings: [...calculations, ...vague, ...prices],
  };
}

/** Le résultat en une phrase, pour les lecteurs d'écran (le téléphone animé leur est masqué). */
export function describePhoneResult(quote: DemoQuote, result: PhoneResult): string {
  const savings = result.savings === null ? "rien à économiser" : fr(`jusqu'à ${formatEuros(result.savings, 0)} à économiser`);
  const findings = result.findings.map((finding) => {
    if (finding.kind === "calculation") {
      return fr(`erreur de calcul sur « ${finding.label} » : ${finding.operation} font ${finding.corrected}, pas ${finding.printed}`);
    }
    if (finding.kind === "vague-line") return fr(`ligne à préciser : « ${finding.label} »`);
    return fr(`« ${finding.label} » : ${finding.delta} ${finding.comparison} (${finding.source})`);
  });
  return fr(`Exemple fictif, ${quote.title.toLowerCase()} : ${savings}. Verdict : ${result.verdictLabel.toLowerCase()}. `) + `${findings.join(" ; ")}.`;
}
