import { REGIONS, type RegionCode } from "@/config/regions";
import { headerFromExtraction, type AnalysisData } from "@/lib/analysis/live-state";
import type { Finding, PriceOpinion, VerdictResult } from "@/lib/analysis/result";
import type { Extraction } from "@/lib/extraction/schema";

/**
 * Ce qu'une page de partage public montre d'une analyse : la feuille corrigée
 * et son verdict, sans rien qui permette de retrouver le client ou l'artisan.
 *
 * - Le lieu se réduit à la région (jamais le département).
 * - Pas de date de devis, de validité ni de délai : avec le lieu, elles
 *   pourraient désigner un chantier.
 * - Pas de rappel personnel (délai de rétractation, signature à domicile).
 * - Pas de lien vers l'analyse privée ni de message de négociation.
 *
 * Le nom de l'entreprise, son adresse et ses numéros n'ont, eux, jamais été
 * lus : l'extraction n'en garde que des booléens de présence.
 */

export interface ShareSource {
  readonly shareId: string;
  readonly region: string | null;
  readonly createdAt: Date;
  readonly extraction: Extraction;
  readonly findings: readonly Finding[];
  readonly prices: readonly PriceOpinion[];
  readonly pricesComplete: boolean;
  readonly verdict: VerdictResult;
}

export interface SharedView {
  readonly data: AnalysisData;
  /** Région lisible, ou `null` si elle n'est pas connue. */
  readonly place: string | null;
}

function regionName(code: string | null): string | null {
  return code !== null && code in REGIONS ? REGIONS[code as RegionCode] : null;
}

export function shareableAnalysis(source: ShareSource): SharedView {
  // On garde seulement l'acompte (il explique un constat) ; le reste de `meta` situe le chantier.
  const { depositPercent, depositAmount } = source.extraction.meta;
  const meta: Extraction["meta"] = { isDoorToDoorSale: false };
  if (depositPercent !== undefined) meta.depositPercent = depositPercent;
  if (depositAmount !== undefined) meta.depositAmount = depositAmount;
  const extraction: Extraction = { ...source.extraction, meta };
  const reminders = source.findings.filter((finding) => finding.kind === "reminder");
  const findings = source.findings.filter((finding) => finding.kind !== "reminder");
  const privatePoints = new Set(reminders.map((finding) => finding.detail));
  const verdict: VerdictResult = {
    ...source.verdict,
    keyPoints: source.verdict.keyPoints.filter((point) => !privatePoints.has(point)),
  };

  return {
    place: regionName(source.region),
    data: {
      header: headerFromExtraction(extraction),
      lines: extraction.lines.map((line, index) => ({ index, line })),
      extraction,
      findings,
      prices: source.prices,
      pricesComplete: source.pricesComplete,
      verdict,
      // Jamais l'identifiant de l'analyse privée sur une page publique.
      analysisId: null,
      expiresAt: null,
      correctedAt: source.createdAt.toISOString(),
      remaining: null,
    },
  };
}

/** Résumé d'une correction partagée, pour la page et son image : « 2 erreurs vérifiées · 1 point d'attention ». */
export function shareCounts(findings: readonly Finding[]): { readonly errors: number; readonly warnings: number } {
  const sure = findings.filter((finding) => finding.confirmed);
  return {
    errors: sure.filter((finding) => finding.kind === "error").length,
    warnings: sure.filter((finding) => finding.kind === "warning").length,
  };
}
